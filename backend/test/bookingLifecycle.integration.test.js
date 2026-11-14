import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import User from "../src/models/user.model.js";
import Court from "../src/models/court.model.js";
import SubCourt from "../src/models/subCourt.model.js";
import CourtSlot from "../src/models/courtSlot.model.js";
import Booking from "../src/models/booking.model.js";
import { createCoreBooking } from "../src/services/createBooking.service.js";
import { cancelCoreBooking, confirmCoreBooking, completeCoreBooking, recordCoreRefund, reconcileBookingReservations } from "../src/services/bookingLifecycle.service.js";
import bookingService from "../src/services/booking.service.js";
import adminService from "../src/services/admin.service.js";
import adminRepository from "../src/repositories/admin.repository.js";
import vendorService from "../src/services/vendor.service.js";

test("Booking recovery and payment lifecycle in an isolated database", async t => {
    const dbName = `pickleball_test_${randomUUID().replaceAll("-", "")}`;
    await mongoose.connect(process.env.TEST_MONGO_URL || "mongodb://127.0.0.1:27018", { dbName, serverSelectionTimeoutMS: 5000 });
    t.after(async () => {
        assert.equal(mongoose.connection.name, dbName);
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });
    await Promise.all([User.init(), Court.init(), SubCourt.init(), CourtSlot.init(), Booking.init()]);
    const user = await User.create({ fullName: "Lifecycle test", email: "lifecycle@example.invalid", password: "test-only-password" });
    const court = await Court.create({ name: "Lifecycle court", location: "Test", type: "INDOOR", pricePerHour: 100000 });
    const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
    let laneNumber = 0;
    const slotFixture = async () => {
        const lane = await SubCourt.create({ courtId: court._id, name: `Lane ${++laneNumber}` });
        return CourtSlot.create({ courtId: court._id, subCourtId: lane._id, date, startTime: "10:00", endTime: "11:00" });
    };
    const intentFixture = async (slot, state = "PREPARING") => Booking.create({ bookingCode: randomUUID(), userId: user._id,
        courtId: court._id, slotId: slot._id, bookingDate: date, startTime: "10:00", endTime: "11:00",
        durationHours: 1, courtPrice: 100000, totalPrice: 105000, reservationState: state,
        reservationExpiresAt: new Date(Date.now() - 60000) });

    await t.test("Retrying a committed request replays exactly one booking", async () => {
        const slot = await slotFixture(), requestKey = randomUUID();
        const first = await createCoreBooking(user._id, { slotId: slot._id, requestKey });
        const replay = await createCoreBooking(user._id, { slotId: slot._id, requestKey });
        assert.equal(String(first.bookingId), String(replay.bookingId));
        assert.equal(await Booking.countDocuments({ userId: user._id, requestKey }), 1);
        await assert.rejects(() => createCoreBooking(user._id, { slotId: new mongoose.Types.ObjectId(), requestKey }), { status: 409 });
    });

    await t.test("Expired intent releases only its own lock and cannot commit later", async () => {
        const slot = await slotFixture(), intent = await intentFixture(slot);
        await CourtSlot.updateOne({ _id: slot._id }, { isBooked: true, bookingId: intent._id });
        await reconcileBookingReservations();
        assert.equal((await Booking.findById(intent._id)).reservationState, "FAILED");
        assert.equal((await CourtSlot.findById(slot._id)).isBooked, false);
        assert.equal(await Booking.findOneAndUpdate({ _id: intent._id, reservationState: "PREPARING" }, { reservationState: "COMMITTED" }), null);
        const replacement = await createCoreBooking(user._id, { slotId: slot._id });
        await reconcileBookingReservations();
        assert.equal(String((await CourtSlot.findById(slot._id)).bookingId), String(replacement.bookingId));
        const history = await bookingService.getUserBookingHistory(user._id);
        assert.ok(!history.some(row => String(row._id) === String(intent._id)));
    });

    await t.test("Recovery also catches a delayed lock written after the intent expired", async () => {
        const slot = await slotFixture(), intent = await intentFixture(slot);
        await reconcileBookingReservations();
        await CourtSlot.updateOne({ _id: slot._id }, { isBooked: true, bookingId: intent._id });
        await reconcileBookingReservations();
        assert.equal((await CourtSlot.findById(slot._id)).isBooked, false);
    });

    await t.test("A definitely failed request returns a code allowing a fresh retry key", async () => {
        const slot = await slotFixture(), requestKey = randomUUID();
        const first = await createCoreBooking(user._id, { slotId: slot._id });
        await assert.rejects(() => createCoreBooking(user._id, { slotId: slot._id, requestKey }), { status: 409, code: "SLOT_ALREADY_BOOKED" });
        await cancelCoreBooking(first.bookingId, { userId: user._id });
        await assert.rejects(() => createCoreBooking(user._id, { slotId: slot._id, requestKey }), { status: 409, code: "RESERVATION_FAILED" });
        const retried = await createCoreBooking(user._id, { slotId: slot._id, requestKey: randomUUID() });
        assert.ok(retried.bookingId);
    });

    await t.test("Confirmation rejects a lost slot or unavailable court", async () => {
        const slot = await slotFixture();
        const result = await createCoreBooking(user._id, { slotId: slot._id });
        await Court.updateOne({ _id: court._id }, { status: "MAINTENANCE" });
        await assert.rejects(() => confirmCoreBooking(result.bookingId), { status: 409 });
        await Court.updateOne({ _id: court._id }, { status: "AVAILABLE" });
        await CourtSlot.updateOne({ _id: slot._id }, { bookingId: null, isBooked: false });
        await assert.rejects(() => confirmCoreBooking(result.bookingId), { status: 409 });
        await cancelCoreBooking(result.bookingId, { admin: true });
    });

    await t.test("Paid cancellation waits for manual refund; retries cannot unlock another owner", async () => {
        const slot = await slotFixture();
        const result = await createCoreBooking(user._id, { slotId: slot._id });
        await assert.rejects(() => cancelCoreBooking(result.bookingId, { userId: new mongoose.Types.ObjectId() }), { status: 403 });
        await confirmCoreBooking(result.bookingId);
        await adminService.recordCashPayment(result.bookingId, user._id);
        await assert.rejects(() => completeCoreBooking(result.bookingId));
        const cancelled = await cancelCoreBooking(result.bookingId, { userId: user._id });
        assert.equal(cancelled.refundPending, true);
        assert.equal(cancelled.refunded, false);
        assert.equal(cancelled.booking.paymentStatus, "REFUND_PENDING");
        const next = await createCoreBooking(user._id, { slotId: slot._id });
        await cancelCoreBooking(result.bookingId, { userId: user._id });
        assert.equal(String((await CourtSlot.findById(slot._id)).bookingId), String(next.bookingId));
        const refunded = await recordCoreRefund(result.bookingId, user._id);
        assert.equal(refunded.booking.paymentStatus, "REFUNDED");
        assert.ok(refunded.booking.refundedAt);
        await assert.rejects(() => recordCoreRefund(result.bookingId, user._id), { status: 409 });
    });

    await t.test("Maintenance cancels unapproved expired bookings and completes only paid confirmed ones", async () => {
        const pendingSlot = await slotFixture(), paidSlot = await slotFixture(), unpaidSlot = await slotFixture();
        const pending = await createCoreBooking(user._id, { slotId: pendingSlot._id });
        const paid = await createCoreBooking(user._id, { slotId: paidSlot._id });
        const unpaid = await createCoreBooking(user._id, { slotId: unpaidSlot._id });
        await confirmCoreBooking(paid.bookingId);
        await confirmCoreBooking(unpaid.bookingId);
        await adminService.recordCashPayment(paid.bookingId, user._id);
        const past = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        await Booking.updateMany({ _id: { $in: [pending.bookingId, paid.bookingId, unpaid.bookingId] } }, { bookingDate: past });
        await bookingService.autoCompletePastBookings();
        assert.equal((await Booking.findById(pending.bookingId)).status, "CANCELLED");
        assert.equal((await CourtSlot.findById(pendingSlot._id)).isBooked, false);
        assert.equal((await Booking.findById(paid.bookingId)).status, "COMPLETED");
        assert.equal((await Booking.findById(unpaid.bookingId)).status, "CONFIRMED");
        await assert.rejects(() => cancelCoreBooking(paid.bookingId, { admin: true }), { status: 409 });
        assert.equal((await adminRepository.getTotalRevenue()).totalRevenue, 105000);
    });

    await t.test("Deferred payment functions and unsupported settings cannot mutate data", async () => {
        await assert.rejects(() => bookingService.verifyAndExecutePayment(user._id, new mongoose.Types.ObjectId()), { status: 501 });
        await assert.rejects(() => adminService.updateSettings({ slotDaysAhead: 200 }));
        await assert.rejects(() => adminService.updateSettings({ otpEmailConfig: {} }), { status: 501 });
        await assert.rejects(() => adminService.updateUserRole(user._id, { role: "SHIPPER" }));
        await assert.rejects(() => adminService.updateUserRole(user._id, { role: "VENDOR", vendorType: "EQUIPMENT" }));
    });

    await t.test("Vendor statistics aggregate real payment dates without counting failed intents", async () => {
        await User.updateOne({ _id: user._id }, { role: "VENDOR", vendorType: "COURT" });
        await Court.updateOne({ _id: court._id }, { vendorId: user._id });
        const stats = await vendorService.getVendorStats(user._id);
        assert.equal(stats.totalRevenue, 105000);
        assert.equal(stats.monthlyRevenue.length, 1);
        assert.equal(stats.monthlyRevenue[0].revenue, 105000);
        assert.equal(stats.totalBookings, await Booking.countDocuments({ courtId: court._id, reservationState: "COMMITTED" }));
    });
});
