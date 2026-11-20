import test from "node:test";
import assert from "node:assert/strict";
import { resolveSlotHourlyPrice } from "../src/utils/slotPricing.js";

test("prefers a slot-specific hourly rate", () => {
    assert.equal(resolveSlotHourlyPrice({ pricePerHour: 95000 }, { pricePerHour: 70000 }), 95000);
});

test("uses the venue base rate for legacy slots without a snapshot", () => {
    assert.equal(resolveSlotHourlyPrice({}, { pricePerHour: 70000 }), 70000);
});
