import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import express from "express";
import mongoose from "mongoose";
import User from "../src/models/user.model.js";
import Court from "../src/models/court.model.js";
import SubCourt from "../src/models/subCourt.model.js";
import CourtSlot from "../src/models/courtSlot.model.js";
import Booking from "../src/models/booking.model.js";
import bookingController from "../src/controllers/booking.controller.js";
import courtService from "../src/services/court.service.js";
import notificationService from "../src/services/notification.service.js";
import { bookingCreateValidator, handleValidationErrors } from "../src/middlewares/validation.middleware.js";

test("Two authenticated-player identities compete through the real booking HTTP controller", { timeout: 15000 }, async t => {
    const dbName = `pickleball_conflict_${randomUUID().replaceAll("-", "")}`;
    await mongoose.connect(process.env.TEST_MONGO_URL || "mongodb://127.0.0.1:27018", { dbName, serverSelectionTimeoutMS: 5000 });
    let server;
    t.after(async () => {
        if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        try {
            assert.equal(mongoose.connection.name, dbName);
            await mongoose.connection.dropDatabase();
        } finally { await mongoose.disconnect(); }
    });
    await Promise.all([User.init(), Court.init(), SubCourt.init(), CourtSlot.init(), Booking.init()]);
    t.mock.method(notificationService, "createForAdmins", async () => {});
    t.mock.method(notificationService, "createForUser", async () => {});
    const players = await User.create([
        { fullName: "Player A", email: "conflict-a@example.invalid", password: "not-real-password" },
        { fullName: "Player B", email: "conflict-b@example.invalid", password: "not-real-password" }
    ]);
    const court = await Court.create({ name: "Conflict test court", location: "Test", type: "INDOOR", pricePerHour: 100000 });
    const sub = await SubCourt.create({ courtId: court._id, name: "Court 1" });
    const date = new Date(Date.now() + 3 * 86400000).toLocaleDateString("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" });
    const slot = await CourtSlot.create({ courtId: court._id, subCourtId: sub._id, date, startTime: "08:00", endTime: "09:00" });

    const app = express();
    app.use(express.json());
    // Auth itself has separate route tests. Only the authenticated identity is
    // injected here; validation, controller, service, CAS and Mongo writes are real.
    app.post("/api/bookings", (req, res, next) => {
        const player = players.find(player => String(player._id) === req.headers["x-test-player"]);
        if (!player) return res.status(401).json({ success: false });
        req.user = { id: String(player._id) };
        next();
    }, bookingCreateValidator, handleValidationErrors, bookingController.createBooking);
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const request = async (player, requestKey, slotId = slot._id) => {
        const response = await fetch(`http://127.0.0.1:${server.address().port}/api/bookings`, {
            method: "POST", headers: { "Content-Type": "application/json", "x-test-player": String(player._id) },
            body: JSON.stringify({ slotId, requestKey, paymentMethod: "CASH" })
        });
        return { status: response.status, body: await response.json() };
    };
    const keys = players.map(() => randomUUID());
    let results;
    let winner;

    await t.test("Only one player commits; the other gets HTTP 409 SLOT_ALREADY_BOOKED", async () => {
        // Both requests read a free slot and persist intents before either tries
        // the CAS, so this proves the race path rather than only an early check.
        const originalCreate = Booking.create;
        let arrivals = 0;
        let release;
        const barrier = new Promise(resolve => { release = resolve; });
        const barrierTimer = setTimeout(release, 3000);
        const mocked = t.mock.method(Booking, "create", async function (...args) {
            const record = await originalCreate.apply(this, args);
            if (++arrivals === 2) release();
            await barrier;
            return record;
        });
        try { results = await Promise.all(players.map((player, index) => request(player, keys[index]))); }
        finally { mocked.mock.restore(); clearTimeout(barrierTimer); }
        assert.equal(arrivals, 2);
        winner = results.findIndex(result => result.status === 201);
        assert.notEqual(winner, -1);
        assert.equal(results.filter(result => result.status === 201).length, 1);
        const rejected = results[1 - winner];
        assert.equal(rejected.status, 409);
        assert.equal(rejected.body.code, "SLOT_ALREADY_BOOKED");
        assert.match(rejected.body.message, /đã có người đặt/);
        assert.equal(await Booking.countDocuments({ slotId: slot._id, reservationState: "COMMITTED" }), 1);
        assert.equal(await Booking.countDocuments({ slotId: slot._id, reservationState: "FAILED" }), 1);
        const occupied = await CourtSlot.findById(slot._id);
        assert.equal(occupied.isBooked, true);
        assert.equal(String(occupied.bookingId), results[winner].body.bookingId);
    });

    await t.test("Fresh availability shows the winner's slot as booked for the other player", async () => {
        const detail = await courtService.getCourtDetail(court._id, date);
        const occupied = detail.subCourtsTimeline.flatMap(sub => sub.slots).find(item => String(item._id) === String(slot._id));
        assert.equal(occupied.isBooked, true);
        assert.equal(occupied.isPast, false);
        assert.equal(occupied.isMaintenance, false);
    });

    await t.test("Winner retry is idempotent; losing retry never steals or frees the slot", async () => {
        const retry = await request(players[winner], keys[winner]);
        assert.equal(retry.status, 201);
        assert.equal(retry.body.bookingId, results[winner].body.bookingId);
        const failedRetry = await request(players[1 - winner], keys[1 - winner]);
        assert.equal(failedRetry.status, 409);
        assert.equal(failedRetry.body.code, "RESERVATION_FAILED");
        const freshRetry = await request(players[1 - winner], randomUUID());
        assert.equal(freshRetry.status, 409);
        assert.equal(freshRetry.body.code, "SLOT_ALREADY_BOOKED");
        assert.equal(await Booking.countDocuments({ slotId: slot._id, reservationState: "COMMITTED" }), 1);
        assert.equal(await Booking.countDocuments({ slotId: slot._id, reservationState: "FAILED" }), 2);
        assert.equal(String((await CourtSlot.findById(slot._id)).bookingId), results[winner].body.bookingId);
    });

    await t.test("A stale slot removed by schedule changes has a refreshable 409 contract", async () => {
        const result = await request(players[1 - winner], randomUUID(), new mongoose.Types.ObjectId());
        assert.equal(result.status, 409);
        assert.equal(result.body.code, "SLOT_UNAVAILABLE");
        assert.equal(await Booking.countDocuments({ reservationState: "COMMITTED" }), 1);
    });
});
