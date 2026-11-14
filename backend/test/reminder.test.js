import test from "node:test";
import assert from "node:assert/strict";
import { runBookingReminders } from "../src/services/bookingReminder.service.js";

const initialTime = new Date("2030-01-01T16:50:00Z");
const minute = 60000;
const matches = (record, filter) => Object.entries(filter).every(([key, value]) => {
    if (key === "$and") return value.every(part => matches(record, part));
    if (key === "$or") return value.some(part => matches(record, part));
    if (value === null) return record[key] == null;
    if (value && typeof value === "object" && !(value instanceof Date)) {
        return Object.entries(value).every(([operator, operand]) => {
            if (operator === "$lte") return record[key] != null && record[key] <= operand;
            if (operator === "$gt") return record[key] != null && record[key] > operand;
            if (operator === "$in") return operand.includes(record[key]);
            throw new Error(`Unexpected filter operator ${operator}`);
        });
    }
    return record[key] === value;
});

function fixture(count = 1) {
    let current = +initialTime;
    const records = Array.from({ length: count }, (_, index) => ({
        _id: String(index + 1), status: "CONFIRMED", bookingDate: "2030-01-02", startTime: "00:10",
        startsAt: new Date(+initialTime + 20 * minute),
        userId: { email: "player@example.invalid" }, courtId: { name: "Test Court" }
    }));
    const update = (record, mutation) => {
        Object.assign(record, mutation.$set);
        for (const key of Object.keys(mutation.$unset || {})) delete record[key];
        for (const [key, value] of Object.entries(mutation.$inc || {})) record[key] = (record[key] || 0) + value;
        return record;
    };
    const claims = [];
    const model = {
        find(filter) {
            return { sort() { return this; }, async lean() { return structuredClone(records.filter(item => matches(item, filter))); } };
        },
        findOneAndUpdate(filter, mutation) {
            return {
                populate() { return this; },
                then(resolve, reject) {
                    const record = records.find(item => matches(item, filter));
                    if (record) {
                        claims.push(structuredClone(mutation.$set));
                        update(record, mutation);
                    }
                    return Promise.resolve(record ? structuredClone(record) : null).then(resolve, reject);
                }
            };
        },
        async findOne(filter) { return records.find(item => matches(item, filter)) || null; },
        async updateOne(filter, mutation) {
            const record = records.find(item => matches(item, filter));
            if (record) update(record, mutation);
        }
    };
    return { model, records, claims, clock: () => new Date(current), advance: delta => { current += delta; } };
}

test("slow email batches use a fresh five-minute lease for each booking", async () => {
    const f = fixture(2);
    let sends = 0;
    const mail = { assertConfigured() {}, async sendBookingReminder() { sends++; f.advance(6 * minute); } };
    await runBookingReminders({ model: f.model, mail, clock: f.clock });
    assert.equal(sends, 2);
    assert.equal(+f.claims[1].reminderLeaseUntil, +initialTime + 11 * minute);
    assert.equal(+f.records[1].reminderSentAt, +initialTime + 12 * minute);
    assert.equal(f.records[1].reminderClaim, undefined);
});

test("fixed test time is used consistently even when different from wall clock", async () => {
    const f = fixture();
    let sends = 0;
    await runBookingReminders({ model: f.model, now: initialTime, mail: { assertConfigured() {}, async sendBookingReminder() { sends++; } } });
    assert.equal(sends, 1);
    assert.equal(+f.records[0].reminderSentAt, +initialTime);
});

test("parallel workers cannot send a booking already claimed or delivered", async () => {
    const f = fixture();
    let sends = 0;
    const options = { model: f.model, clock: f.clock, mail: { assertConfigured() {}, async sendBookingReminder() { sends++; } } };
    await Promise.all([runBookingReminders(options), runBookingReminders(options)]);
    await runBookingReminders(options);
    assert.equal(sends, 1);
});

test("cancelled bookings and expired leases are rechecked before delivery", async () => {
    for (const change of [f => { f.records[0].status = "CANCELLED"; }, f => f.advance(6 * minute)]) {
        const f = fixture();
        let sends = 0;
        const findOne = f.model.findOne;
        f.model.findOne = async filter => { change(f); return findOne(filter); };
        await runBookingReminders({ model: f.model, clock: f.clock, mail: {
            assertConfigured() {}, async sendBookingReminder() { sends++; }
        } });
        assert.equal(sends, 0);
        assert.equal(f.records[0].reminderSentAt, undefined);
        assert.equal(f.records[0].reminderClaim, undefined);
    }
});

test("failed delivery retries after two minutes using the failure time", async () => {
    const f = fixture();
    const mail = { assertConfigured() {}, async sendBookingReminder() { f.advance(minute); throw new Error("Expected SMTP failure"); } };
    await runBookingReminders({ model: f.model, clock: f.clock, mail });
    assert.equal(f.records[0].reminderSentAt, undefined);
    assert.equal(+f.records[0].reminderRetryAt, +initialTime + 3 * minute);
    let sends = 0;
    const retry = { model: f.model, clock: f.clock, mail: { assertConfigured() {}, async sendBookingReminder() { sends++; } } };
    await runBookingReminders(retry);
    assert.equal(sends, 0);
    f.advance(2 * minute);
    await runBookingReminders(retry);
    assert.equal(sends, 1);
    assert.equal(f.records[0].reminderRetryAt, undefined);
});

test("a booking that starts while waiting in the batch is skipped", async () => {
    const f = fixture(2);
    let sends = 0;
    await runBookingReminders({ model: f.model, clock: f.clock, mail: {
        assertConfigured() {}, async sendBookingReminder() { sends++; f.advance(21 * minute); }
    } });
    assert.equal(sends, 1);
    assert.equal(f.records[1].reminderAttempts, undefined);
});
