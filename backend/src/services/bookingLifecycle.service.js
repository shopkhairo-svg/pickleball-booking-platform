import mongoose from "mongoose";
import Booking from "../models/booking.model.js";
import CourtSlot from "../models/courtSlot.model.js";
import Court from "../models/court.model.js";
import SubCourt from "../models/subCourt.model.js";
import notificationService from "./notification.service.js";

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const bookingDateTime = (booking, time) => new Date(`${booking.bookingDate}T${time}:00+07:00`);
const assertId = id => { if (!mongoose.isValidObjectId(id)) throw fail("Mã đơn đặt sân không hợp lệ."); };
const notify = async booking => {
    try {
        await notificationService.createForUser({ userId: booking.userId, title: "Cập nhật lịch đặt sân", message: `Đơn ${booking.bookingCode}: ${booking.status === "CANCELLED" ? "đã hủy" : "đã hoàn tất"}.${booking.paymentStatus === "REFUND_PENDING" ? " Tiền đã thu đang chờ quản trị viên hoàn trả và xác nhận." : ""}`, type: "BOOKING", referenceId: booking._id, referenceType: "Booking" });
    } catch (error) { console.error("[Booking] Notification:", error.message); }
};

export async function releaseCancelledSlot(booking) {
    return CourtSlot.updateOne({ bookingId: booking._id, ...(booking.slotId ? { _id: booking.slotId } : {}) }, { $set: { isBooked: false, bookingId: null } });
}

export async function cancelCoreBooking(bookingId, { userId, reason = "", admin = false } = {}) {
    assertId(bookingId);
    if (typeof reason !== "string" || reason.length > 1000) throw fail("Lý do hủy tối đa 1000 ký tự.");
    let booking = await Booking.findById(bookingId);
    if (!booking) throw fail("Đơn đặt sân không tồn tại.", 404);
    if (!admin && String(booking.userId) !== String(userId)) throw fail("Bạn không có quyền hủy đơn này.", 403);
    if (booking.status === "COMPLETED" || booking.reservationState === "PREPARING") throw fail("Không thể hủy đơn ở trạng thái hiện tại.", 409);
    if (booking.status !== "CANCELLED") {
        const startsAt = bookingDateTime(booking, booking.startTime);
        if (!Number.isFinite(+startsAt)) throw fail("Giờ chơi của đơn không hợp lệ.");
        if (!admin && startsAt - Date.now() < 36 * 3600000) throw fail("Bạn chỉ được tự hủy trước giờ chơi ít nhất 36 tiếng. Vui lòng liên hệ sân nếu cần hỗ trợ.");
        const updated = await Booking.findOneAndUpdate({ _id: bookingId, status: booking.status, paymentStatus: booking.paymentStatus, reservationState: { $ne: "PREPARING" } }, {
            $set: { status: "CANCELLED", cancelReason: reason.trim() || (admin ? "Quản trị viên hủy lịch." : "Khách hàng yêu cầu hủy lịch."), paymentStatus: booking.paymentStatus === "PAID" ? "REFUND_PENDING" : booking.paymentStatus }
        }, { returnDocument: "after" });
        if (!updated) throw fail("Đơn vừa thay đổi. Vui lòng tải lại trước khi hủy.", 409);
        booking = updated;
        await notify(booking);
    }
    // Safe to retry after a DB outage between cancellation and slot release.
    await releaseCancelledSlot(booking);
    return { message: "Đã hủy lịch đặt sân.", booking, bookingCode: booking.bookingCode, status: booking.status, refundPending: booking.paymentStatus === "REFUND_PENDING", refunded: booking.paymentStatus === "REFUNDED" };
}

export async function confirmCoreBooking(bookingId) {
    assertId(bookingId);
    const candidate = await Booking.findById(bookingId);
    if (!candidate || candidate.status !== "PENDING" || candidate.reservationState === "PREPARING" || candidate.reservationState === "FAILED") throw fail("Chỉ được xác nhận đơn đang chờ duyệt.", 409);
    if (bookingDateTime(candidate, candidate.startTime) <= new Date()) throw fail("Giờ chơi đã bắt đầu.");
    const slot = await CourtSlot.findOne({ _id: candidate.slotId, bookingId, isBooked: true });
    const [court, subCourt] = slot ? await Promise.all([Court.findById(candidate.courtId), SubCourt.findById(slot.subCourtId)]) : [];
    if (!slot || court?.status !== "AVAILABLE" || subCourt?.status !== "AVAILABLE") throw fail("Ô giờ hoặc sân không còn khả dụng. Vui lòng kiểm tra và hủy đơn nếu cần.", 409);
    const booking = await Booking.findOneAndUpdate({ _id: bookingId, status: "PENDING", reservationState: { $nin: ["PREPARING", "FAILED"] } }, { $set: { status: "CONFIRMED" } }, { returnDocument: "after" });
    if (!booking) throw fail("Đơn vừa thay đổi. Vui lòng tải lại.", 409);
    try { await notificationService.createForUser({ userId: booking.userId, title: "Lịch đặt sân đã được xác nhận", message: `Đơn ${booking.bookingCode}: ${booking.startTime} ngày ${booking.bookingDate}. Thanh toán tại sân.`, type: "BOOKING", referenceId: booking._id, referenceType: "Booking" }); }
    catch (error) { console.error("[Booking] Notification:", error.message); }
    return { message: "Đã xác nhận lịch đặt sân.", booking };
}

export async function completeCoreBooking(bookingId) {
    assertId(bookingId);
    const candidate = await Booking.findById(bookingId);
    if (!candidate || candidate.status !== "CONFIRMED" || candidate.paymentStatus !== "PAID") throw fail("Chỉ được hoàn tất đơn đã xác nhận và đã thanh toán.", 409);
    const endsAt = bookingDateTime(candidate, candidate.endTime);
    if (!Number.isFinite(+endsAt) || endsAt > new Date()) throw fail("Chưa đến giờ kết thúc lượt chơi.");
    const booking = await Booking.findOneAndUpdate({ _id: bookingId, status: "CONFIRMED", paymentStatus: "PAID" }, { $set: { status: "COMPLETED" } }, { returnDocument: "after" });
    if (!booking) throw fail("Đơn vừa thay đổi. Vui lòng tải lại.", 409);
    await notify(booking);
    return { message: "Đã hoàn tất lượt chơi. Khách hàng có thể gửi đánh giá.", booking };
}

export async function recordCoreRefund(bookingId, adminId) {
    assertId(bookingId);
    const booking = await Booking.findOneAndUpdate({ _id: bookingId, status: "CANCELLED", paymentStatus: "REFUND_PENDING" }, { $set: { paymentStatus: "REFUNDED", refundedAt: new Date(), refundRecordedBy: adminId } }, { returnDocument: "after" });
    if (!booking) throw fail("Chỉ xác nhận hoàn tiền cho đơn đã hủy và đang chờ hoàn tiền.", 409);
    return { message: "Đã ghi nhận xác nhận hoàn tiền của quản trị viên.", booking, refunded: true };
}

let maintenanceRunning = false;
export async function reconcileBookingReservations(now = new Date()) {
    if (maintenanceRunning) return;
    maintenanceRunning = true;
    try {
        // Cancel the intent first. A delayed request can no longer commit it after this CAS.
        await Booking.updateMany({ reservationState: "PREPARING", reservationExpiresAt: { $lte: now } }, { $set: { reservationState: "FAILED", status: "CANCELLED", cancelReason: "Yêu cầu giữ chỗ chưa hoàn tất đã hết hạn." } });
        // Scan locks, not the ever-growing cancellation history. Recheck ownership on release.
        const cancelled = await CourtSlot.aggregate([
            { $match: { isBooked: true, bookingId: { $ne: null } } },
            { $lookup: { from: Booking.collection.name, localField: "bookingId", foreignField: "_id", as: "booking" } },
            { $match: { "booking.status": "CANCELLED" } },
            { $limit: 500 }, { $project: { _id: 1, bookingId: 1 } }
        ]);
        if (cancelled.length) await CourtSlot.bulkWrite(cancelled.map(slot => ({ updateOne: { filter: { _id: slot._id, bookingId: slot.bookingId, isBooked: true }, update: { $set: { isBooked: false, bookingId: null } } } })));
    } finally { maintenanceRunning = false; }
}
