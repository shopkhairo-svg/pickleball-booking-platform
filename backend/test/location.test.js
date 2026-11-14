import test from "node:test";
import assert from "node:assert/strict";
import Court from "../src/models/court.model.js";
import { getLocationSuggestions, parseLocationQuery } from "../src/services/locationSuggestion.service.js";
import { locationAreas, searchLocationAreas } from "../src/utils/locationCatalogue.js";

test("Autocomplete accepts short free text and enforces bounded input", () => {
    assert.deepEqual(parseLocationQuery(), { q: "", limit: 8 });
    assert.deepEqual(parseLocationQuery({ q: "  Thủ Đức  ", limit: "15" }), { q: "Thủ Đức", limit: 15 });
    assert.deepEqual(parseLocationQuery({ q: "Q", limit: 1 }), { q: "Q", limit: 1 });
    assert.equal(parseLocationQuery({ q: "a".repeat(120) }).q.length, 120);
    for (const q of [["Q7"], { $ne: null }, null, true, 7, "a".repeat(121)]) {
        assert.throws(() => parseLocationQuery({ q }), { status: 400 });
    }
    for (const limit of [0, 16, -1, 1.5, [], [8], { $gt: 0 }, true, null, "", " ", "8rows", Infinity]) {
        assert.throws(() => parseLocationQuery({ limit }), { status: 400 });
    }
});

test("Malformed autocomplete input is rejected before any database operation", async t => {
    const aggregate = t.mock.method(Court, "aggregate", () => { throw new Error("Database must not be queried"); });
    for (const query of [{ q: { $regex: ".*" } }, { q: ["Q7", "Hanoi"] }, { limit: "500" }]) {
        await assert.rejects(() => getLocationSuggestions(query), { status: 400 });
    }
    assert.equal(aggregate.mock.callCount(), 0);
});

test("Unaccented and accented district searches produce the same selectable area", () => {
    const accented = searchLocationAreas("Thủ Đức");
    const unaccented = searchLocationAreas("thu duc");
    assert.deepEqual(accented.map(item => item.id), unaccented.map(item => item.id));
    const district = unaccented.find(item => item.locationId === "vn-v1-d-769");
    assert.ok(district);
    assert.equal(district.value, "Thành phố Thủ Đức");
    assert.match(district.label, /Hồ Chí Minh/);
    assert.match(district.description, /địa chỉ cũ/);
    assert.equal(district.source, "area");
    assert.equal(district.courtCount, undefined, "An area suggestion must not invent available court counts");
    assert.ok(searchLocationAreas("thu d").some(item => item.locationId === district.locationId));
});

test("Common city and district abbreviations find the expected administrative area", () => {
    for (const q of ["Q7", "Q.7", "quận 7"]) {
        assert.ok(searchLocationAreas(q).some(item => item.locationId === "vn-v1-d-778"), q);
    }
    for (const q of ["TPHCM", "TP.HCM", "ho chi minh"]) {
        assert.equal(searchLocationAreas(q)[0]?.locationId, "vn-v2-p-79", q);
    }
    assert.equal(searchLocationAreas("ha noi")[0]?.locationId, "vn-v2-p-01");
    assert.equal(searchLocationAreas("phuong sai gon")[0]?.locationId, "vn-v2-w-26740");
});

test("Initial suggestions are current provinces and are independent of court availability", () => {
    const suggestions = searchLocationAreas("");
    assert.ok(suggestions.length > 0);
    assert.ok(suggestions.length <= 8);
    assert.equal(new Set(suggestions.map(item => item.id)).size, suggestions.length);
    for (const suggestion of suggestions) {
        const area = locationAreas.find(item => item.id === suggestion.locationId);
        assert.equal(area.kind, "province");
        assert.equal(area.legacy, false);
    }
    assert.equal(searchLocationAreas(" ", 1).length, 1);
});

test("Province-qualified suggestions disambiguate districts with the same name", () => {
    const suggestions = searchLocationAreas("chau thanh tay ninh", 15);
    assert.ok(suggestions.some(item => item.locationId === "vn-v1-d-708"));
    assert.ok(suggestions.every(item => /Tây Ninh/.test(item.label)));
    assert.deepEqual(searchLocationAreas("zzzz-no-such-area"), []);
    assert.deepEqual(searchLocationAreas(".*"), []);
});
