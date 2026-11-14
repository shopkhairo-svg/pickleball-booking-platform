import test from "node:test";
import assert from "node:assert/strict";
import { buildCourtFilters } from "../src/utils/courtFilters.js";
import { courtDate, futureSlotFilter } from "../src/utils/courtQuery.js";
import { parseCoordinates, coordinateBounds } from "../src/utils/coordinates.js";
import { slotTimes } from "../src/utils/slotTimes.js";
import { parseCourtInput, activeSlotFilter } from "../src/utils/courtInput.js";

test("Court numeric filters reject repeated parameters, booleans and whitespace", () => {
    for (const value of [["1"], true, {}, " "]) {
        assert.throws(() => buildCourtFilters({ page: value }));
        assert.throws(() => buildCourtFilters({ minPrice: value }));
        assert.throws(() => parseCoordinates({ latitude: value, longitude: 1 }));
    }
    assert.equal(buildCourtFilters({ minPrice: "0", maxPrice: 0 }).filter.pricePerHour.$gte, 0);
});

test("Court dates validate actual calendar days and Vietnam midnight", () => {
    for (const value of ["2026-02-30", "2026-2-01", ["2026-02-01"], "", "2026-13-01"]) assert.throws(() => courtDate(value));
    assert.equal(courtDate("2028-02-29"), "2028-02-29");
    const now = new Date("2030-01-01T17:10:30Z");
    assert.equal(futureSlotFilter("2030-01-01", now), null);
    assert.deepEqual(futureSlotFilter("2030-01-02", now), { date: "2030-01-02", isBooked: false, startTime: { $gt: "00:10:30" } });
    assert.deepEqual(futureSlotFilter("2030-01-03", now), { date: "2030-01-03", isBooked: false });
});

test("Nearby bounding box supports the date line and polar latitudes", () => {
    const bounds = coordinateBounds(0, 179.99, 5);
    assert.equal(bounds.$or.length, 2);
    assert.ok(bounds.$or[1].longitude.$lte < -179.9);
    assert.equal(coordinateBounds(89.99, 0, 5).longitude, undefined);
    assert.ok(coordinateBounds(10.7, 106.7, 5).longitude.$gte < 106.7);
});

test("A valid schedule must provide at least one complete slot", () => {
    assert.throws(() => slotTimes({ openTime: "08:00", closeTime: "08:30", slotDuration: 60 }));
    assert.equal(slotTimes({ openTime: "08:15", closeTime: "09:15", slotDuration: 30 }).length, 2);
});

test("Court writes accept zero prices and validate partial updates against the saved schedule", () => {
    const existing = { name: "Sân", location: "HCM", type: "INDOOR", pricePerHour: 100, openTime: "08:00", closeTime: "10:00", slotDuration: 60 };
    assert.equal(parseCourtInput({ pricePerHour: 0 }, existing).pricePerHour, 0);
    for (const data of [{ pricePerHour: -1 }, { pricePerHour: "100abc" }, { pricePerHour: [] }, { name: " " }, { type: "BAD" }, { status: "BAD" }, { amenities: {} }, { slotDuration: "30min" }, { closeTime: "08:30" }]) assert.throws(() => parseCourtInput(data, existing));
    assert.equal(parseCourtInput({ ...existing, pricePerHour: 0 }).pricePerHour, 0);
    assert.deepEqual(activeSlotFilter({ courtId: "example" }, new Date("2030-01-01T17:10:30Z")).$or, [{ date: { $gt: "2030-01-02" } }, { date: "2030-01-02", endTime: { $gt: "00:10:30" } }]);
});
