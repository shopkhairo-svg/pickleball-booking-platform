import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Booking from "../models/booking.model.js";
import CourtSlot from "../models/courtSlot.model.js";
import SubCourt from "../models/subCourt.model.js";
import Court from "../models/court.model.js";
import notificationService from "./notification.service.js";

export async function createCoreBooking(userId, payload) {
    const { slotId, equipments = [], paymentMethod = "CASH", note = "", couponCode, pointsToUse } = payload;
    if (!mongoose.isValidObjectId(slotId)) throw new Error("Ô giờ không hợp lệ.");
    if (!Array.isArray(equipments) || equipments.length || couponCode || Number(pointsToUse || 0) !== 0 || paymentMethod !== "CASH") {
        throw Object.assign(new Error("Thuê dụng cụ, ưu đãi và thanh toán online đang phát triển. Vui lòng chọn thanh toán tại sân."), { status: 501 });
    }
    if (typeof note !== "string" || note.length > 1000) throw new Error("Ghi chú tối đa 1000 ký tự.");
    const candidate = await CourtSlot.findById(slotId);
    if (!candidate) throw new Error("Khung giờ không tồn tại.");
    const startsAt = new Date(`${candidate.date}T${candidate.startTime}:00+07:00`);
    const endsAt = new Date(`${candidate.date}T${candidate.endTime}:00+07:00`);
    const durationHours = (endsAt - startsAt) / 3600000;
    if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date() || !Number.isFinite(durationHours) || durationHours <= 0) throw new Error("Khung giờ không hợp lệ hoặc đã bắt đầu.");
    const [court, subCourt] = await Promise.all([Court.findById(candidate.courtId), SubCourt.findById(candidate.subCourtId)]);
    if (!court || court.status !== "AVAILABLE" || !subCourt || subCourt.status !== "AVAILABLE" || String(subCourt.courtId) !== String(court._id)) throw new Error("Sân hiện không nhận đặt lịch.");
    if (!Number.isFinite(court.pricePerHour) || court.pricePerHour < 0) throw new Error("Giá sân chưa được cấu hình hợp lệ.");

    const bookingId = new mongoose.Types.ObjectId();
    const slot = await CourtSlot.findOneAndUpdate({ _id: slotId, isBooked: false, startTime: candidate.startTime, endTime: candidate.endTime, date: candidate.date }, {
        $set: { isBooked: true, bookingId }
    }, { new: true });
    if (!slot) throw Object.assign(new Error("Ô giờ vừa được đặt. Vui lòng chọn ô giờ khác."), { status: 409 });
    let booking;
    try {
        const courtPrice = Math.round(court.pricePerHour * durationHours);
        const systemFee = Math.round(courtPrice * 0.05);
        booking = await Booking.create({
            _id: bookingId, bookingCode: `BK-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`,
            userId, slotId: slot._id, courtId: court._id, bookingDate: slot.date,
            startTime: slot.startTime, endTime: slot.endTime, startsAt, durationHours,
            courtPrice, systemFee, totalPrice: courtPrice + systemFee,
            paymentMethod: "CASH", paymentStatus: "UNPAID", status: "PENDING", note: note.trim()
        });
    } catch (error) {
        // A database timeout may be an ambiguous successful insert. Never unlock a persisted booking.
        const persisted = await Booking.exists({ _id: bookingId });
        if (!persisted) await CourtSlot.updateOne({ _id: slotId, bookingId }, { $set: { isBooked: false, bookingId: null } });
        throw error;
    }
    // Notification failures must not turn a committed reservation into a free slot.
    const notification = { title: "Có đơn đặt sân mới", message: `Đơn ${booking.bookingCode} chờ xác nhận.`, type: "BOOKING", referenceId: booking._id, referenceType: "Booking" };
    const results = await Promise.allSettled([
        notificationService.createForAdmins(notification),
        notificationService.createForUser({ ...notification, userId, title: "Đã gửi yêu cầu đặt sân", message: `Đơn ${booking.bookingCode} đang chờ quản trị viên xác nhận. Thanh toán tại sân.` }),
        ...(court.vendorId ? [notificationService.createForUser({ ...notification, userId: court.vendorId })] : [])
    ]);
    results.forEach(result => { if (result.status === "rejected") console.error("[Booking] Notification failed:", result.reason?.message); });
    return { message: "Đặt sân thành công, đang chờ xác nhận. Thanh toán tại sân.", bookingId: booking._id, bookingCode: booking.bookingCode, totalPrice: booking.totalPrice, courtPrice: booking.courtPrice, equipmentPrice: 0, discount: 0, pointsUsed: 0 };
}
