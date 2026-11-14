import test from "node:test";
import assert from "node:assert/strict";
import { applyLocationDraft, applyLocationSelection, scheduleLocationSuggestions } from "../src/utils/locationSuggestions.js";

function timers() {
    const pending = new Map();
    let sequence = 0;
    return {
        schedule(callback, delay) { assert.equal(delay, 250); pending.set(++sequence, callback); return sequence; },
        cancel(id) { pending.delete(id); },
        run() {
            const callbacks = [...pending.values()];
            pending.clear();
            return callbacks.map(callback => callback());
        },
    };
}
const deferred = () => {
    let resolve, reject;
    const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
    return { promise, resolve, reject };
};

test("Typing again before the debounce elapses fetches only the latest location", async () => {
    const clock = timers(), calls = [], results = [];
    const fetchSuggestions = async query => { calls.push(query); return { success: true, suggestions: [] }; };
    const options = { ...clock, fetchSuggestions, onResult: result => results.push(result) };
    const cancel = scheduleLocationSuggestions("thu", options);
    cancel();
    scheduleLocationSuggestions("thu duc", options);
    await Promise.all(clock.run());
    assert.deepEqual(calls, ["thu duc"]);
    assert.deepEqual(results.map(result => [result.query, result.status]), [["thu duc", "loading"], ["thu duc", "ready"]]);
});

test("A canceled request cannot replace newer suggestions even if its adapter ignores AbortSignal", async () => {
    const clock = timers(), requests = new Map(), results = [];
    const fetchSuggestions = (query, { signal }) => {
        const request = deferred(); requests.set(query, { ...request, signal }); return request.promise;
    };
    const options = { ...clock, fetchSuggestions, onResult: result => results.push(result) };
    const cancelFirst = scheduleLocationSuggestions("thu", options);
    const first = clock.run();
    cancelFirst();
    assert.equal(requests.get("thu").signal.aborted, true);
    scheduleLocationSuggestions("da nang", options);
    const second = clock.run();
    requests.get("da nang").resolve({ success: true, suggestions: [{ id: "dn", label: "Đà Nẵng", value: "Đà Nẵng" }] });
    await Promise.all(second);
    requests.get("thu").resolve({ success: true, suggestions: [{ id: "td", label: "Thủ Đức", value: "Thủ Đức" }] });
    await Promise.all(first);
    assert.equal(results.at(-1).query, "da nang");
    assert.equal(results.filter(result => result.status === "ready").length, 1);
});

test("Closing the menu cancels in-flight errors; a real failure stays distinct from an empty result", async () => {
    const clock = timers(), request = deferred(), results = [];
    const cancel = scheduleLocationSuggestions("q", { ...clock, fetchSuggestions: () => request.promise, onResult: result => results.push(result) });
    const tasks = clock.run(); cancel(); request.reject(new Error("Late network failure")); await Promise.all(tasks);
    assert.deepEqual(results.map(result => result.status), ["loading"]);
    scheduleLocationSuggestions("", { ...clock, fetchSuggestions: async () => ({ success: true, suggestions: [] }), onResult: result => results.push(result) });
    await Promise.all(clock.run());
    assert.deepEqual(results.at(-1), { query: "", status: "ready", suggestions: [] });
    scheduleLocationSuggestions("x", { ...clock, fetchSuggestions: async () => { throw new Error("Network failed"); }, onResult: result => results.push(result) });
    await Promise.all(clock.run());
    assert.equal(results.at(-1).status, "error");
});

test("Selecting a region preserves other applied filters and disambiguates equal location names", () => {
    const current = new URLSearchParams("search=pickle&type=INDOOR&date=2030-01-02&minPrice=0&maxPrice=200000&page=4&location=old&locationId=old-id");
    const selected = applyLocationSelection(current, { value: "Phường Bình An", locationId: "vn-v1-w-123", label: "Phường Bình An, Tỉnh A" });
    assert.equal(selected.get("location"), "Phường Bình An");
    assert.equal(selected.get("locationId"), "vn-v1-w-123");
    assert.equal(selected.get("page"), "1");
    for (const key of ["search", "type", "date", "minPrice", "maxPrice"]) assert.equal(selected.get(key), current.get(key));
    assert.equal(current.get("page"), "4");
    assert.equal(current.get("locationId"), "old-id");
    const fromCourt = applyLocationSelection(selected, { value: "Đường A", label: "Đường A", source: "court" });
    assert.equal(fromCourt.has("locationId"), false);
});

test("Free-text edits and clearing remove obsolete region IDs; unchanged regional filters retain them", () => {
    const current = new URLSearchParams({ location: "Thành phố Thủ Đức", locationId: "vn-v1-d-769", type: "OUTDOOR", page: "3" });
    assert.equal(applyLocationDraft(current, " Thành phố Thủ Đức ").get("locationId"), "vn-v1-d-769");
    const edited = applyLocationDraft(current, "Quận 7");
    assert.equal(edited.get("location"), "Quận 7");
    assert.equal(edited.has("locationId"), false);
    assert.equal(edited.get("type"), "OUTDOOR");
    const cleared = applyLocationDraft(current, "   ");
    assert.equal(cleared.has("location"), false);
    assert.equal(cleared.has("locationId"), false);
    assert.equal(cleared.get("page"), "1");
});
