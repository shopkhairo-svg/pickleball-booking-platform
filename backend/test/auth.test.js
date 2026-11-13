import { test, mock } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { getSmtpOptions, getGoogleClientId } from "../src/config/authConfig.js";

process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.JWT_ACCESS_EXPIRATION = "15m";
process.env.JWT_REFRESH_EXPIRATION = "7d";

const records = new Map();
const users = new Map();
let failMail = false;
const redis = {
    get: async key => records.get(key) ?? null,
    set: async (key, value) => { records.set(key, String(value)); },
    del: async key => records.delete(key),
    incr: async key => { const n = Number(records.get(key) || 0) + 1; records.set(key, String(n)); return n; },
    decr: async key => { const n = Number(records.get(key) || 0) - 1; records.set(key, String(n)); return n; }
};
const repository = {
    findByEmail: async email => users.get(email),
    findById: async id => [...users.values()].find(user => user._id === id),
    create: async data => {
        if (users.has(data.email)) throw new Error("Duplicate email");
        const user = { role: "USER", ...data, _id: String(users.size + 1), save: async () => {} };
        users.set(user.email, user);
        return user;
    },
    updateLastLogin: async () => {}
};
const sendMail = async () => { if (failMail) throw Object.assign(new Error("SMTP unavailable"), { status: 503 }); };
mock.module("../src/config/redis.js", { defaultExport: redis });
mock.module("../src/repositories/user.repository.js", { defaultExport: repository });
mock.module("../src/utils/mail.util.js", { defaultExport: {
    assertConfigured() {}, sendOTPEmail: sendMail, sendForgotPasswordOTPEmail: sendMail
} });
mock.module("../src/utils/googleAuth.util.js", { defaultExport: {
    async verifyGoogleToken(token) {
        if (token !== "valid-google-id-token") throw new Error("Invalid Google token");
        return { email: "google@example.com", name: "Google User", email_verified: true };
    }
} });
const pass = (req, res, next) => next();
mock.module("../src/middlewares/rateLimiter.middleware.js", { namedExports: { authLimiter: pass, globalLimiter: pass } });

test("SMTP and Google configuration", () => {
    assert.throws(() => getSmtpOptions({ MAIL_HOST: "smtp.gmail.com", MAIL_USER: "your_email", MAIL_PASSWORD: "your_password" }), { status: 503 });
    const env = { MAIL_HOST: "smtp.example.com", MAIL_USER: "test@example.com", MAIL_PASSWORD: "test-password" };
    assert.equal(getSmtpOptions({ ...env, MAIL_PORT: "465" }).secure, true);
    assert.equal(getSmtpOptions({ ...env, MAIL_PORT: "587" }).secure, false);
    assert.throws(() => getGoogleClientId({ GOOGLE_CLIENT_ID: "your_google_client_id" }), { status: 503 });
    assert.equal(getGoogleClientId({ GOOGLE_CLIENT_ID: "123-example.apps.googleusercontent.com" }), "123-example.apps.googleusercontent.com");
});

test("Auth API contracts with isolated DB, Redis, SMTP and Google doubles", async t => {
    const { default: routes } = await import("../src/routes/auth.routes.js");
    const app = express();
    app.use(express.json());
    app.use("/api/auth", routes);
    const server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const request = async (path, body = {}, method = "POST", token) => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/${path}`, {
            method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(body)
        });
        return { status: response.status, body: await response.json() };
    };
    await t.test("register failure rolls back pending OTP and returns 503", async () => {
        failMail = true;
        const result = await request("register", { email: "failure@example.com", fullName: "Test User", password: "password123" });
        assert.equal(result.status, 503);
        assert.equal(records.has("pending-register:failure@example.com"), false);
        failMail = false;
    });
    await t.test("register normalizes email and does not create user before OTP", async () => {
        const result = await request("register", { email: " User@Example.com ", fullName: "Test User", password: "password123" });
        assert.equal(result.status, 200);
        assert.equal(users.has("user@example.com"), false);
        assert.ok(records.has("pending-register:user@example.com"));
    });
    await t.test("verify-otp validates input, normalizes email and returns no login tokens", async () => {
        assert.equal((await request("verify-otp", { email: "user@example.com", otpCode: "abcdef" })).status, 400);
        const { otp } = JSON.parse(records.get("pending-register:user@example.com"));
        const result = await request("verify-otp", { email: "USER@EXAMPLE.COM", otpCode: otp });
        assert.equal(result.status, 201);
        assert.equal(result.body.accessToken, undefined);
        assert.equal(records.has("pending-register:user@example.com"), false);
        assert.equal((await request("verify-otp", { email: "user@example.com", otpCode: otp })).status, 400);
    });
    let session;
    await t.test("login rejects incorrect password and returns tokens for valid credentials", async () => {
        assert.equal((await request("login", { email: "user@example.com", password: "incorrect" })).status, 400);
        const result = await request("login", { email: "user@example.com", password: "password123" });
        assert.equal(result.status, 200);
        session = result.body;
        assert.ok(session.accessToken && session.refreshToken);
        assert.equal(session.user.password, undefined);
    });
    await t.test("google-login requires ID token and handles verified identity", async () => {
        assert.equal((await request("google-login", {})).status, 400);
        assert.equal((await request("google-login", { idToken: "invalid" })).status, 400);
        assert.equal((await request("google-login", { idToken: "valid-google-id-token" })).status, 200);
    });
    await t.test("refresh-token validates input and refreshes valid session", async () => {
        assert.equal((await request("refresh-token", {})).status, 400);
        assert.equal((await request("refresh-token", { refreshToken: "invalid" })).status, 401);
        assert.equal((await request("refresh-token", { refreshToken: session.refreshToken })).status, 200);
    });
    await t.test("forgot-password failure does not consume email quota", async () => {
        failMail = true;
        assert.equal((await request("forgot-password", { email: "user@example.com" })).status, 503);
        assert.equal(records.has("forgot-password-otp:user@example.com"), false);
        assert.equal(Number(records.get("forgot-password-count:user@example.com")), 0);
        failMail = false;
    });
    await t.test("reset-password changes password and revokes refresh session", async () => {
        assert.equal((await request("forgot-password", { email: "user@example.com" })).status, 200);
        const otpCode = records.get("forgot-password-otp:user@example.com");
        assert.equal((await request("reset-password", { email: "user@example.com", otpCode, newPassword: "new-password123" }, "PUT")).status, 200);
        assert.equal((await request("refresh-token", { refreshToken: session.refreshToken })).status, 401);
        assert.equal((await request("login", { email: "user@example.com", password: "password123" })).status, 400);
        session = (await request("login", { email: "user@example.com", password: "new-password123" })).body;
        assert.ok(session.accessToken);
    });
    await t.test("logout revokes refresh token and blacklists access token", async () => {
        assert.equal((await request("logout")).status, 401);
        assert.equal((await request("logout", {}, "POST", "invalid-token")).status, 401);
        assert.equal((await request("logout", {}, "POST", session.accessToken)).status, 200);
        assert.equal((await request("refresh-token", { refreshToken: session.refreshToken })).status, 401);
        assert.equal((await request("logout", {}, "POST", session.accessToken)).status, 401);
    });
});
