import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import Court from "../src/models/court.model.js";
import SubCourt from "../src/models/subCourt.model.js";
import CourtSlot from "../src/models/courtSlot.model.js";
import Booking from "../src/models/booking.model.js";
import Review from "../src/models/review.model.js";
import { DEMO_COURTS } from "../src/demo/demoData.js";
import { MAP_COURTS } from "../src/data/mapCourts.js";
import { importMapCourts, importedCourtId, cleanLegacyCourtLabels } from "../src/data/importMapCourts.js";

test("Map import cleans labels and preserves owner edits, references and booked slots on repeat", async t => {
    assert.equal(cleanLegacyCourtLabels({ name: "Owner court", description: "Sân giả lập để kiểm thử tìm kiếm và đặt lịch. Đây không phải địa điểm kinh doanh thực tế; tên, địa chỉ và tọa độ chỉ dùng minh hoạ. Nội dung QTV đã bổ sung." }).description, "Nội dung QTV đã bổ sung.");
    const dbName = `pickleball_map_import_test_${randomUUID().replaceAll("-", "")}`;
    await mongoose.connect(process.env.TEST_MONGO_URL || "mongodb://127.0.0.1:27018", { dbName, serverSelectionTimeoutMS: 5000 });
    t.after(async () => {
        assert.equal(mongoose.connection.name, dbName);
        assert.match(dbName, /^pickleball_map_import_test_[a-f0-9]{32}$/);
        await mongoose.connection.dropDatabase();
        await mongoose.disconnect();
    });
    const legacy = await Court.create({ ...DEMO_COURTS[0], name: "DEMO · Pickleball Linh Trung", address: "Điểm demo 01, khu vực Linh Trung", amenities: ["Dữ liệu demo", "Giữ xe"], description: "Sân giả lập để kiểm thử tìm kiếm và đặt lịch. Đây không phải địa điểm kinh doanh thực tế; tên, địa chỉ và tọa độ chỉ dùng minh hoạ." });
    const ownerCourt = await Court.create({ ...DEMO_COURTS[5], name: "Sân cầu lông Bình Thắng_Badminton club", address: "Địa chỉ do QTV nhập", description: "Mô tả riêng của chủ sân", pricePerHour: 99000, images: [{ imageUrl: "/uploads/owner.jpg", publicId: "owner" }] });
    const legacyLane = await SubCourt.create({ courtId: legacy._id, name: "Sân demo 01" });
    const entries = MAP_COURTS.filter(entry => ["hl-sport", "binh-thang-badminton", "ttp-sports"].includes(entry.key));

    const preview = await importMapCourts({ entries, days: 2, dryRun: true });
    assert.equal(preview.created.length, 2);
    assert.equal(preview.existing.length, 1);
    assert.equal(await Court.countDocuments(), 2);
    assert.equal((await SubCourt.findById(legacyLane._id)).name, "Sân demo 01");

    await importMapCourts({ entries, days: 2 });
    const cleaned = await Court.findById(legacy._id);
    assert.equal(cleaned.name, "Pickleball Linh Trung");
    assert.equal(cleaned.address, "Khu vực Linh Trung");
    assert.deepEqual([...cleaned.amenities], ["Giữ xe"]);
    assert.doesNotMatch(cleaned.description, /demo|giả lập|kiểm thử/i);
    assert.equal((await SubCourt.findById(legacyLane._id)).name, "Sân 01");
    assert.deepEqual((await Court.findById(ownerCourt._id).lean()), ownerCourt.toObject());
    assert.equal(await Court.countDocuments(), 4);
    assert.equal((await Court.findById(importedCourtId("ttp-sports"))).status, "HIDDEN");
    assert.equal(await CourtSlot.countDocuments({ courtId: importedCourtId("ttp-sports") }), 0);

    const slot = await CourtSlot.findOne({ courtId: importedCourtId("hl-sport") }).sort({ date: -1, startTime: -1 });
    const player = new mongoose.Types.ObjectId();
    const booking = await Booking.create({ bookingCode: randomUUID(), userId: player, courtId: slot.courtId, slotId: slot._id, bookingDate: slot.date, startTime: slot.startTime, endTime: slot.endTime, durationHours: 1, courtPrice: 55000, totalPrice: 55000, paymentStatus: "PAID", status: "COMPLETED" });
    const review = await Review.create({ userId: player, courtId: slot.courtId, bookingId: booking._id, rating: 4, comment: "Existing review", status: "APPROVED" });
    await CourtSlot.updateOne({ _id: slot._id }, { $set: { isBooked: true, bookingId: booking._id, pricePerHour: 55000, isPriceOverride: true } });
    const beforeSlot = await CourtSlot.findById(slot._id).lean();
    const beforeBooking = await Booking.findById(booking._id).lean();
    const beforeReview = await Review.findById(review._id).lean();
    const slotCount = await CourtSlot.countDocuments();
    const repeat = await importMapCourts({ entries, days: 2 });
    assert.deepEqual(repeat.created, []);
    assert.equal(repeat.cleanedCourts, 0);
    assert.equal(repeat.cleanedSubCourts, 0);
    assert.equal(await Court.countDocuments(), 4);
    assert.equal(await CourtSlot.countDocuments(), slotCount);
    assert.deepEqual(await CourtSlot.findById(slot._id).lean(), beforeSlot);
    assert.deepEqual(await Booking.findById(booking._id).lean(), beforeBooking);
    assert.deepEqual(await Review.findById(review._id).lean(), beforeReview);
});
