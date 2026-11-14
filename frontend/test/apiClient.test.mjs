import test from "node:test";
import assert from "node:assert/strict";
import axios, { AxiosError } from "axios";
import { createApiClient } from "../src/api/createApiClient.js";

const deferred = () => {
    let resolve;
    const promise = new Promise(done => { resolve = done; });
    return { promise, resolve };
};
const fail = (config, status) => { throw new AxiosError("Test request failed", "ERR_BAD_RESPONSE", config, null, { status, config, data: {} }); };

function fixture({ onRefresh = async () => ({ accessToken: "new-token" }), beforeRequest } = {}) {
    const records = new Map([["refreshToken", "refresh-one"]]);
    const storage = { getItem: key => records.get(key), removeItem: key => records.delete(key) };
    const state = {
        user: { id: "one" }, accessToken: "old-token", isAuthenticated: true,
        setAuth(user, accessToken) { Object.assign(state, { user, accessToken, isAuthenticated: true }); },
        clearAuth() { Object.assign(state, { user: null, accessToken: null, isAuthenticated: false }); }
    };
    const started = deferred();
    let refreshCount = 0;
    let redirects = 0;
    const adapter = async config => {
        if (config.url === "/api/auth/refresh-token") {
            refreshCount++;
            started.resolve();
            const data = await onRefresh(config, refreshCount);
            return { status: 200, config, data, headers: {} };
        }
        await beforeRequest?.(config);
        if (config.headers.Authorization !== "Bearer new-token") fail(config, 401);
        return { status: 200, config, data: { ok: true }, headers: {} };
    };
    const transport = axios.create({ adapter });
    transport.create = options => axios.create({ ...options, adapter });
    const client = createApiClient({ axios: transport, authStore: { getState: () => state }, storage, baseURL: "/api", onUnauthorized: () => redirects++ });
    return { client, state, storage, records, started, refreshCount: () => refreshCount, redirects: () => redirects };
}

test("simultaneous 401 responses share one refresh", async () => {
    const gate = deferred();
    const f = fixture({ onRefresh: () => gate.promise });
    const calls = Promise.all([f.client.get("/first"), f.client.get("/second")]);
    await f.started.promise;
    gate.resolve({ accessToken: "new-token" });
    assert.deepEqual(await calls, [{ ok: true }, { ok: true }]);
    assert.equal(f.refreshCount(), 1);
});

test("a late 401 retries with the already refreshed token", async () => {
    const gate = deferred();
    const slowStarted = deferred();
    const f = fixture({ beforeRequest: async config => {
        if (config.url === "/slow" && !config._retry) { slowStarted.resolve(); await gate.promise; }
    } });
    const slow = f.client.get("/slow");
    await slowStarted.promise;
    assert.deepEqual(await f.client.get("/fast"), { ok: true });
    gate.resolve();
    assert.deepEqual(await slow, { ok: true });
    assert.equal(f.refreshCount(), 1);
});

test("a completed refresh cannot resurrect a logged-out account", async () => {
    const gate = deferred();
    const f = fixture({ onRefresh: () => gate.promise });
    const failed = assert.rejects(f.client.get("/profile"), /Session changed/);
    await f.started.promise;
    f.state.clearAuth();
    f.storage.removeItem("refreshToken");
    gate.resolve({ accessToken: "new-token" });
    await failed;
    assert.equal(f.state.isAuthenticated, false);
    assert.equal(f.state.accessToken, null);
    assert.equal(f.redirects(), 0);
});

test("failure from a previous session cannot clear a newly logged-in account", async () => {
    const gate = deferred();
    const f = fixture({ onRefresh: async config => { await gate.promise; fail(config, 401); } });
    const failed = assert.rejects(f.client.get("/profile"));
    await f.started.promise;
    f.state.setAuth({ id: "two" }, "other-token");
    f.records.set("refreshToken", "refresh-two");
    gate.resolve();
    await failed;
    assert.equal(f.state.user.id, "two");
    assert.equal(f.storage.getItem("refreshToken"), "refresh-two");
    assert.equal(f.redirects(), 0);
});

test("transient refresh failure preserves credentials and the next request can recover", async () => {
    const f = fixture({ onRefresh: async (config, attempt) => {
        if (attempt === 1) fail(config, 503);
        return { accessToken: "new-token" };
    } });
    await assert.rejects(f.client.get("/profile"));
    assert.equal(f.state.isAuthenticated, true);
    assert.equal(f.storage.getItem("refreshToken"), "refresh-one");
    assert.equal(f.redirects(), 0);
    assert.deepEqual(await f.client.get("/profile"), { ok: true });
    assert.equal(f.refreshCount(), 2);
});

test("a rejected refresh clears only its own current session", async () => {
    const f = fixture({ onRefresh: async config => fail(config, 401) });
    await assert.rejects(f.client.get("/profile"));
    assert.equal(f.state.isAuthenticated, false);
    assert.equal(f.storage.getItem("refreshToken"), undefined);
    assert.equal(f.redirects(), 1);
});
