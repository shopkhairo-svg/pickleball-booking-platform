import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import Booking from "../models/booking.model.js";
import CourtSlot from "../models/courtSlot.model.js";
import SubCourt from "../models/subCourt.model.js";
import Court from "../models/court.model.js";
import notificationService from "./notification.service.js";

const summary = booking => ({ message: "Đặt sân thành công, đang chờ xác nhận. Thanh toán tại sân.", bookingId: booking._id, bookingCode: booking.bookingCode, totalPrice: booking.totalPrice, courtPrice: booking.courtPrice, equipmentPrice: 0, discount: 0, pointsUsed: 0 });
const slotConflict = (alreadyBooked = false) => Object.assign(new Error(alreadyBooked
    ? "Ô giờ này đã có người đặt. Vui lòng chọn ô giờ khác."
    : "Ô giờ không còn khả dụng hoặc lịch sân đã thay đổi. Vui lòng chọn lại."), {
    status: 409, code: alreadyBooked ? "SLOT_ALREADY_BOOKED" : "SLOT_UNAVAILABLE"
});
const replay = (booking, slotId) => {
    if (String(booking.slotId) !== String(slotId)) throw Object.assign(new Error("Mã yêu cầu đã được dùng cho ô giờ khác."), { status: 409 });
    if (booking.reservationState === "FAILED") throw Object.assign(new Error("Yêu cầu giữ chỗ đã thất bại hoặc hết hạn. Vui lòng thử lại."), { status: 409, code: "RESERVATION_FAILED" });
    if (booking.reservationState !== "COMMITTED" || booking.status === "CANCELLED") throw Object.assign(new Error("Yêu cầu giữ chỗ đang xử lý hoặc đã hết hạn. Vui lòng kiểm tra lịch sử đặt sân."), { status: 409 });
    return summary(booking);
};

export async function createCoreBooking(userId, payload) {
    const { slotId, equipments = [], paymentMethod = "CASH", note = "", couponCode, pointsToUse, requestKey } = payload;
    if (!mongoose.isValidObjectId(slotId)) throw new Error("Ô giờ không hợp lệ.");
    if (!Array.isArray(equipments) || equipments.length || couponCode || Number(pointsToUse || 0) !== 0 || paymentMethod !== "CASH") {
        throw Object.assign(new Error("Thuê dụng cụ, ưu đãi và thanh toán online đang phát triển. Vui lòng chọn thanh toán tại sân."), { status: 501 });
    }
    if (typeof note !== "string" || note.length > 1000) throw new Error("Ghi chú tối đa 1000 ký tự.");
    if (requestKey !== undefined && (typeof requestKey !== "string" || !/^[a-zA-Z0-9_-]{16,100}$/.test(requestKey))) throw new Error("Mã yêu cầu đặt sân không hợp lệ.");
    if (requestKey) {
        const existing = await Booking.findOne({ userId, requestKey });
        if (existing) return replay(existing, slotId);
    }
    const candidate = await CourtSlot.findById(slotId);
    if (!candidate) throw slotConflict();
    const startsAt = new Date(`${candidate.date}T${candidate.startTime}:00+07:00`);
    const endsAt = new Date(`${candidate.date}T${candidate.endTime}:00+07:00`);
    const durationHours = (endsAt - startsAt) / 3600000;
    if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date() || !Number.isFinite(durationHours) || durationHours <= 0) throw new Error("Khung giờ không hợp lệ hoặc đã bắt đầu.");
    const [court, subCourt] = await Promise.all([Court.findById(candidate.courtId), SubCourt.findById(candidate.subCourtId)]);
    if (!court || court.status !== "AVAILABLE" || !subCourt || subCourt.status !== "AVAILABLE" || String(subCourt.courtId) !== String(court._id)) throw new Error("Sân hiện không nhận đặt lịch.");
    if (!Number.isFinite(court.pricePerHour) || court.pricePerHour < 0) throw new Error("Giá sân chưa được cấu hình hợp lệ.");

    const bookingId = new mongoose.Types.ObjectId();
    let booking;
    try {
        const courtPrice = Math.round(court.pricePerHour * durationHours);
        const systemFee = Math.round(courtPrice * 0.05);
        booking = await Booking.create({
            _id: bookingId, bookingCode: `BK-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`,
            userId, slotId: candidate._id, courtId: court._id, bookingDate: candidate.date,
            startTime: candidate.startTime, endTime: candidate.endTime, startsAt, durationHours,
            courtPrice, systemFee, totalPrice: courtPrice + systemFee,
            paymentMethod: "CASH", paymentStatus: "UNPAID", status: "PENDING", note: note.trim(),
            reservationState: "PREPARING", reservationExpiresAt: new Date(Date.now() + 2 * 60000),
            ...(requestKey ? { requestKey } : {})
        });
    } catch (error) {
        if (error.code === 11000 && requestKey) {
            const existing = await Booking.findOne({ userId, requestKey });
            if (existing) return replay(existing, slotId);
        }
        throw error;
    }
    try {
        const slot = await CourtSlot.findOneAndUpdate({ _id: slotId, isBooked: false, startTime: candidate.startTime, endTime: candidate.endTime, date: candidate.date }, {
            $set: { isBooked: true, bookingId }
        }, { returnDocument: "after" });
        if (!slot) {
            const currentSlot = await CourtSlot.findById(slotId).select("isBooked").lean();
            throw slotConflict(Boolean(currentSlot?.isBooked));
        }
        const committed = await Booking.findOneAndUpdate({ _id: bookingId, reservationState: "PREPARING", reservationExpiresAt: { $gt: new Date() } }, {
            $set: { reservationState: "COMMITTED" }, $unset: { reservationExpiresAt: 1 }
        }, { returnDocument: "after" });
        if (!committed) throw Object.assign(new Error("Yêu cầu giữ chỗ đã hết hạn. Vui lòng thử lại."), { status: 409 });
        booking = committed;
    } catch (error) {
        // Resolve ambiguous successful writes before releasing anything.
        const persisted = await Booking.findById(bookingId);
        if (persisted?.reservationState === "COMMITTED") return summary(persisted);
        const failed = await Booking.updateOne({ _id: bookingId, reservationState: "PREPARING" }, { $set: { reservationState: "FAILED", status: "CANCELLED" } });
        await CourtSlot.updateOne({ _id: slotId, bookingId }, { $set: { isBooked: false, bookingId: null } });
        if (!["SLOT_ALREADY_BOOKED", "SLOT_UNAVAILABLE"].includes(error.code) && (failed.matchedCount || persisted?.reservationState === "FAILED")) error.code = "RESERVATION_FAILED";
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
    return summary(booking);
}
