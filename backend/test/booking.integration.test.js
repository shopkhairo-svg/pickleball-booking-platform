import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import User from "../src/models/user.model.js";
import Court from "../src/models/court.model.js";
import SubCourt from "../src/models/subCourt.model.js";
import CourtSlot from "../src/models/courtSlot.model.js";
import Booking from "../src/models/booking.model.js";
import Review from "../src/models/review.model.js";
import { createCoreBooking } from "../src/services/createBooking.service.js";
import courtService from "../src/services/court.service.js";
import bookingService from "../src/services/booking.service.js";
import adminService from "../src/services/admin.service.js";
import reviewService from "../src/services/review.service.js";
import notificationService from "../src/services/notification.service.js";
import { runBookingReminders } from "../src/services/bookingReminder.service.js";

test("Core workflow against an isolated MongoDB database (no real emails)", async t => {
    const dbName = `pickleball_test_${randomUUID().replaceAll("-", "")}`;
    await mongoose.connect(process.env.TEST_MONGO_URL || "mongodb://127.0.0.1:27018", { dbName, serverSelectionTimeoutMS: 5000 });
    t.after(async () => {
        assert.equal(mongoose.connection.name, dbName);
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });
    await Promise.all([User.init(), Court.init(), SubCourt.init(), CourtSlot.init(), Booking.init(), Review.init()]);
    const user = await User.create({ fullName: "Test User", email: "player@example.invalid", password: "not-real-password" });
    const court = await Court.create({ name: "Sân Bình Thạnh", location: "Hồ Chí Minh", address: "Quận Bình Thạnh", type: "INDOOR", pricePerHour: 100000, slotDuration: 60 });
    const sub = await SubCourt.create({ courtId: court._id, name: "Court 1" });
    const date = new Date(Date.now() + 3 * 86400000).toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
    const slot = await CourtSlot.create({ courtId: court._id, subCourtId: sub._id, date, startTime: "08:30", endTime: "09:00" });
    let booked;
    await t.test("Real database filters match an unaccented address", async () => {
        const result = await courtService.getCourtsListing({ location: "binh thanh", search: "san", maxPrice: "100000" });
        assert.equal(result.courts.length, 1);
    });
    await t.test("Concurrent booking allows exactly one reservation; actual slot duration sets price", async () => {
        const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => createCoreBooking(user._id, { slotId: slot._id })));
        assert.equal(outcomes.filter(item => item.status === "fulfilled").length, 1);
        booked = outcomes.find(item => item.status === "fulfilled").value;
        assert.equal(booked.totalPrice, 52500);
        assert.equal(await Booking.countDocuments(), 1);
        assert.equal(String((await CourtSlot.findById(slot._id)).bookingId), String(booked.bookingId));
    });
    await t.test("Cash receipt requires confirmation and is recorded only once", async () => {
        await assert.rejects(() => adminService.recordCashPayment(booked.bookingId, user._id));
        await adminService.confirmBooking(booked.bookingId);
        const paid = await adminService.recordCashPayment(booked.bookingId, user._id);
        assert.equal(paid.booking.paymentStatus, "PAID");
        await assert.rejects(() => adminService.recordCashPayment(booked.bookingId, user._id));
    });
    await t.test("Persistent reminder claims prevent concurrent duplicate sends", async () => {
        const start = new Date(Date.now() + 20 * 60000);
        await Booking.updateOne({ _id: booked.bookingId }, { startsAt: start, bookingDate: start.toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }) });
        let sent = 0;
        const mail = { assertConfigured() {}, async sendBookingReminder(record) { assert.equal(record.userId.email, user.email); sent++; } };
        await Promise.all([runBookingReminders({ mail }), runBookingReminders({ mail })]);
        await runBookingReminders({ mail });
        assert.equal(sent, 1); assert.ok((await Booking.findById(booked.bookingId)).reminderSentAt);
    });
    await t.test("SMTP failure persists retry without marking delivered", async () => {
        await Booking.updateOne({ _id: booked.bookingId }, { $unset: { reminderSentAt: 1 } });
        const mail = { assertConfigured() {}, async sendBookingReminder() { throw new Error("simulated SMTP failure"); } };
        await runBookingReminders({ mail });
        const record = await Booking.findById(booked.bookingId);
        assert.equal(record.reminderSentAt, undefined); assert.ok(record.reminderRetryAt); assert.equal(record.reminderClaim, undefined);
        let sent = 0;
        await runBookingReminders({ mail: { assertConfigured() {}, async sendBookingReminder() { sent++; } } });
        assert.equal(sent, 0);
    });
    await t.test("Paid completed bookings can review once, even after moderation deletes", async () => {
        await Booking.updateOne({ _id: booked.bookingId }, { status: "COMPLETED" });
        const result = await reviewService.createReview(user._id, { bookingId: booked.bookingId, courtId: court._id, rating: 5 });
        assert.equal(result.review.status, "PENDING");
        await reviewService.updateReviewStatus(result.review._id, "APPROVED");
        assert.equal((await Court.findById(court._id)).averageRating, 5);
        await reviewService.updateReviewStatus(result.review._id, "DELETED");
        assert.equal((await reviewService.getEligibility(user._id, court._id)).canReview, false);
        assert.equal((await Court.findById(court._id)).reviewCount, 0);
    });
    await t.test("Notification errors cannot release a committed slot", async () => {
        const another = await CourtSlot.create({ courtId: court._id, subCourtId: sub._id, date, startTime: "10:00", endTime: "11:00" });
        const original = notificationService.createForAdmins;
        notificationService.createForAdmins = async () => { throw new Error("simulated notification failure"); };
        try {
            const result = await createCoreBooking(user._id, { slotId: another._id });
            assert.ok(await Booking.findById(result.bookingId)); assert.equal((await CourtSlot.findById(another._id)).isBooked, true);
            await bookingService.cancelBookingByUser(user._id, result.bookingId, "test cancellation");
            assert.equal((await CourtSlot.findById(another._id)).isBooked, false);
            await assert.rejects(() => adminService.confirmBooking(result.bookingId));
        } finally { notificationService.createForAdmins = original; }
    });
    await t.test("Maintenance court and deferred extras cannot lock slots", async () => {
        await assert.rejects(() => createCoreBooking(user._id, { slotId: slot._id, equipments: [{ equipmentId: user._id, quantity: 1 }] }), { status: 501 });
        await Court.updateOne({ _id: court._id }, { status: "MAINTENANCE" });
        await assert.rejects(() => createCoreBooking(user._id, { slotId: slot._id }));
    });
});
