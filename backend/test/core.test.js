import test from "node:test";
import assert from "node:assert/strict";
import { buildCourtFilters, searchPattern } from "../src/utils/courtFilters.js";
import { slotTimes } from "../src/utils/slotTimes.js";
import { reminderIsDue } from "../src/services/bookingReminder.service.js";
import { developmentGate } from "../src/middlewares/development.middleware.js";

test("Vietnamese partial search escapes regex and matches accents", () => {
    assert.match("Sân Đà Nẵng", new RegExp(searchPattern("da nang"), "i"));
    assert.match("Quận Bình Thạnh", new RegExp(searchPattern("binh thanh"), "i"));
    assert.equal(new RegExp(searchPattern(".*"), "i").test("anything"), false);
    assert.match("Sân (VIP)", new RegExp(searchPattern("(VIP)"), "i"));
});
test("Area, search, type, zero price and pagination combine", () => {
    const { filter, skip, limit } = buildCourtFilters({ location: "da nang", search: "pickle", type: "indoor", minPrice: "0", maxPrice: "100000", page: "2", limit: "6" });
    assert.equal(filter.$and.length, 2);
    assert.equal(filter.type, "INDOOR"); assert.equal(filter.pricePerHour.$gte, 0);
    assert.equal(skip, 6); assert.equal(limit, 6);
});
test("Reject malformed and excessive queries", () => {
    for (const query of [{ page: -1 }, { limit: 100000 }, { page: "abc" }, { location: {} }, { search: "a".repeat(121) }, { minPrice: -1 }, { minPrice: 20, maxPrice: 10 }, { type: "invalid" }]) assert.throws(() => buildCourtFilters(query));
});
test("Slots preserve opening minutes and reject nonpositive duration", () => {
    assert.deepEqual(slotTimes({ openTime: "06:30", closeTime: "08:00", slotDuration: 45 }), [{ startTime: "06:30", endTime: "07:15" }, { startTime: "07:15", endTime: "08:00" }]);
    for (const slotDuration of [0, -1, 1.5, NaN]) assert.throws(() => slotTimes({ slotDuration }));
    assert.throws(() => slotTimes({ openTime: "22:00", closeTime: "06:00" }));
});
test("Reminder 30 minute boundary, timezone and exclusions", () => {
    const booking = { bookingDate: "2030-01-02", startTime: "00:15", status: "CONFIRMED" };
    assert.equal(reminderIsDue(booking, new Date("2030-01-01T16:45:00Z")), true);
    assert.equal(reminderIsDue(booking, new Date("2030-01-01T16:44:59Z")), false);
    assert.equal(reminderIsDue(booking, new Date("2030-01-01T17:15:00Z")), false);
    for (const status of ["PENDING", "CANCELLED", "COMPLETED"]) assert.equal(reminderIsDue({ ...booking, status }, new Date("2030-01-01T16:45:00Z")), false);
    assert.equal(reminderIsDue({ ...booking, reminderSentAt: new Date() }, new Date("2030-01-01T16:45:00Z")), false);
});
test("Deferred endpoints return an explicit 501; core endpoints continue", () => {
    for (const path of ["/shipper/stats", "/maintenance-staff", "/coupons/validate", "/points/wallet", "/admin/equipments", "/vendor/import-orders/123/confirm", "/bookings/123/verify-payment"]) {
        const res = { status(code) { assert.equal(code, 501); return this; }, json(body) { assert.equal(body.code, "FEATURE_IN_DEVELOPMENT"); } };
        developmentGate({ path }, res, () => assert.fail(path));
    }
    for (const path of ["/auth/login", "/courts", "/bookings", "/admin/bookings/123/cash-payment", "/reviews", "/notifications"]) {
        let passed = false; developmentGate({ path }, {}, () => { passed = true; }); assert.equal(passed, true);
    }
});
