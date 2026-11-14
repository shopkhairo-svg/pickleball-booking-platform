import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Court from "../src/models/court.model.js";
import SubCourt from "../src/models/subCourt.model.js";
import CourtSlot from "../src/models/courtSlot.model.js";
import CourtView from "../src/models/courtView.model.js";
import FavoriteCourt from "../src/models/favoriteCourt.model.js";
import User from "../src/models/user.model.js";
import courtService from "../src/services/court.service.js";
import interactions from "../src/services/courtInteraction.service.js";
import { regenerateSlotsForCourt } from "../src/utils/slotScheduler.js";
import { vietnamDate } from "../src/utils/courtQuery.js";
import adminService from "../src/services/admin.service.js";
import vendorService from "../src/services/vendor.service.js";

test("Court search and schedule regression tests use a disposable database", async t => {
    const dbName = `pickleball_court_test_${randomUUID().replaceAll("-", "")}`;
    await mongoose.connect(process.env.TEST_MONGO_URL || "mongodb://127.0.0.1:27018", { dbName, serverSelectionTimeoutMS: 5000 });
    t.after(async () => {
        assert.equal(mongoose.connection.name, dbName);
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });
    await Promise.all([Court.init(), SubCourt.init(), CourtSlot.init(), CourtView.init(), FavoriteCourt.init()]);
    const date = vietnamDate(new Date(Date.now() + 86400000));
    const court = await Court.create({ name: "Sân Bình Thạnh", location: "Hồ Chí Minh", address: "Bình Thạnh", type: "INDOOR", pricePerHour: 100000, latitude: 10.7, longitude: 106.7 });
    const sub = await SubCourt.create({ courtId: court._id, name: "Lane 1" });
    const slot = await CourtSlot.create({ courtId: court._id, subCourtId: sub._id, date, startTime: "08:00", endTime: "09:00" });
    const userId = new mongoose.Types.ObjectId();

    await t.test("Ordinary date search filters availability before counting and pagination", async () => {
        const query = { date, location: "binh thanh", limit: 1 };
        assert.equal((await courtService.getCourtsListing(query)).pagination.totalItems, 1);
        await CourtSlot.updateOne({ _id: slot._id }, { isBooked: true });
        assert.equal((await courtService.getCourtsListing(query)).pagination.totalItems, 0);
        await CourtSlot.updateOne({ _id: slot._id }, { isBooked: false });
        await SubCourt.updateOne({ _id: sub._id }, { status: "MAINTENANCE" });
        assert.equal((await courtService.getCourtsListing(query)).courts.length, 0);
        await SubCourt.updateOne({ _id: sub._id }, { status: "AVAILABLE" });
        assert.equal((await courtService.getCourtsListing({ ...query, page: 2 })).courts.length, 0);
        assert.equal((await courtService.getCourtsListing({ ...query, date: "2000-01-01" })).courts.length, 0);
    });

    await t.test("Nearby respects geographic bounds, availability and strict inputs", async () => {
        assert.equal((await courtService.getNearbyCourts({ lat: 10.7, lng: 106.7, radius: 1, date })).courts.length, 1);
        assert.equal((await courtService.getNearbyCourts({ lat: 10.8, lng: 106.7, radius: 1, date })).courts.length, 0);
        await assert.rejects(() => courtService.getNearbyCourts({ lat: 10.7, lng: 106.7, radius: [1], date }));
        await Court.updateOne({ _id: court._id }, { longitude: -179.99, latitude: 0 });
        assert.equal((await courtService.getNearbyCourts({ lat: 0, lng: 179.99, radius: 5, date })).courts.length, 1);
    });

    await t.test("Missing guest identity never leaks another user's recently viewed list", async () => {
        await CourtView.create({ userId, courtId: court._id });
        assert.deepEqual((await interactions.getRecentlyViewed({})).courts, []);
        assert.equal((await interactions.getRecentlyViewed({ userId })).courts.length, 1);
        await assert.rejects(() => interactions.getRecentlyViewed({ guestId: { $ne: null } }));
        await assert.rejects(() => interactions.getRecentlyViewed({ userId, limit: -1 }));
    });

    await t.test("Hidden courts are omitted from favorites, recent views and similar lookup", async () => {
        await FavoriteCourt.create({ userId, courtId: court._id });
        await Court.updateOne({ _id: court._id }, { status: "HIDDEN" });
        assert.equal((await interactions.getFavorites(userId)).courts.length, 0);
        assert.equal((await interactions.getRecentlyViewed({ userId })).courts.length, 0);
        await assert.rejects(() => interactions.getSimilarCourts(court._id));
        await Court.updateOne({ _id: court._id }, { status: "AVAILABLE" });
    });

    await t.test("Changing slot duration preserves bookings and avoids intersecting replacements", async () => {
        const other = await Court.create({ name: "Schedule", location: "Test", type: "OUTDOOR", pricePerHour: 100000, openTime: "06:30", closeTime: "08:30", slotDuration: 60 });
        const lane = await SubCourt.create({ courtId: other._id, name: "Lane" });
        await regenerateSlotsForCourt(other._id, 2);
        const held = await CourtSlot.findOneAndUpdate({ subCourtId: lane._id, date, startTime: "06:30" }, { isBooked: true }, { new: true });
        await Court.updateOne({ _id: other._id }, { openTime: "06:00", slotDuration: 45 });
        await Promise.all([regenerateSlotsForCourt(other._id, 2), regenerateSlotsForCourt(other._id, 2)]);
        const slots = await CourtSlot.find({ subCourtId: lane._id, date }).sort({ startTime: 1 }).lean();
        assert.deepEqual(slots.map(slot => [slot.startTime, slot.endTime]), [["06:30", "07:30"], ["07:30", "08:15"]]);
        assert.ok(slots.find(slot => String(slot._id) === String(held._id))?.isBooked);
    });

    await t.test("A booking claimed just before obsolete-slot deletion is preserved", async () => {
        const other = await Court.create({ name: "Race", location: "Test", type: "OUTDOOR", pricePerHour: 100000, openTime: "06:30", closeTime: "08:30", slotDuration: 60 });
        const lane = await SubCourt.create({ courtId: other._id, name: "Lane" });
        await regenerateSlotsForCourt(other._id, 2);
        const old = await CourtSlot.findOne({ subCourtId: lane._id, date, startTime: "06:30" });
        await Court.updateOne({ _id: other._id }, { openTime: "06:00", slotDuration: 45 });
        const deleteMany = CourtSlot.deleteMany;
        let claimed = false;
        const mocked = t.mock.method(CourtSlot, "deleteMany", async function (filter) {
            if (!claimed) {
                claimed = true;
                await CourtSlot.updateOne({ _id: old._id, isBooked: false }, { isBooked: true });
            }
            return deleteMany.call(this, filter);
        });
        try { await regenerateSlotsForCourt(other._id, 2); } finally { mocked.mock.restore(); }
        assert.equal((await CourtSlot.findById(old._id)).isBooked, true);
        const conflicts = await CourtSlot.countDocuments({ subCourtId: lane._id, date, isBooked: false, startTime: { $lt: "07:30" }, endTime: { $gt: "06:30" } });
        assert.equal(conflicts, 0);
    });

    await t.test("Admin court updates validate zero prices and regenerate changed schedules", async () => {
        const { court: other } = await adminService.createCourt({ name: "Admin court", location: "Test", type: "INDOOR", pricePerHour: 0, openTime: "06:00", closeTime: "08:00", slotDuration: 60 }, []);
        const lane = await SubCourt.create({ courtId: other._id, name: "Test lane" });
        await regenerateSlotsForCourt(other._id, 2);
        await adminService.updateCourt(other._id, { pricePerHour: 100, slotDuration: 30 }, []);
        await adminService.updateCourt(other._id, { pricePerHour: 0 }, []);
        assert.equal((await Court.findById(other._id)).pricePerHour, 0);
        const slots = await CourtSlot.find({ subCourtId: lane._id, date }).sort({ startTime: 1 }).lean();
        assert.deepEqual(slots.map(slot => slot.startTime), ["06:00", "06:30", "07:00", "07:30"]);
        await CourtSlot.updateOne({ _id: slots[0]._id }, { isBooked: true });
        await assert.rejects(() => adminService.deleteCourt(other._id));
        await assert.rejects(() => adminService.blockCourt(other._id));
        await assert.rejects(() => adminService.updateCourt(other._id, { openTime: "07:00" }, []));
        await assert.rejects(() => adminService.updateCourt(other._id, { slotDuration: "30minutes" }, []));
        assert.equal((await Court.findById(other._id)).openTime, "06:00");
    });

    await t.test("Vendor court updates apply the same input and active-booking safeguards", async () => {
        const vendor = await User.create({ fullName: "Vendor test", email: "court-vendor@example.invalid", password: "not-a-password", role: "VENDOR", vendorType: "COURT", status: "ACTIVE" });
        const other = await vendorService.createVendorCourt(vendor._id, { name: "Vendor court", location: "Test", type: "OUTDOOR", pricePerHour: 10, openTime: "08:00", closeTime: "09:00", slotDuration: 60 }, []);
        const updated = await vendorService.updateVendorCourt(vendor._id, other._id, { pricePerHour: 0, slotDuration: 30 }, []);
        assert.equal(updated.pricePerHour, 0);
        const slot = await CourtSlot.findOneAndUpdate({ courtId: other._id, date, startTime: "08:00" }, { isBooked: true }, { returnDocument: "after" });
        assert.equal(slot.endTime, "08:30");
        await assert.rejects(() => vendorService.deleteVendorCourt(vendor._id, other._id));
        await assert.rejects(() => vendorService.updateVendorCourt(vendor._id, other._id, { status: "HIDDEN" }, []));
        await assert.rejects(() => vendorService.updateVendorCourt(vendor._id, other._id, { pricePerHour: "15abc" }, []));
    });
});
