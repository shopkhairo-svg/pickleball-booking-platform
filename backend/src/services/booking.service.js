import mongoose from "mongoose";
import { createCoreBooking } from "./createBooking.service.js";
import { cancelCoreBooking, completeCoreBooking, reconcileBookingReservations } from "./bookingLifecycle.service.js";
import bookingRepository from "../repositories/booking.repository.js";
import Booking from "../models/booking.model.js";

const unavailable = () => { throw Object.assign(new Error("Tính năng đang phát triển và đã tạm ngừng hoạt động."), { status: 501 }); };
let maintenanceRunning = false;

class BookingService {
    async createNewBooking(userId, payload) {
        return createCoreBooking(userId, payload);
    }

    async getUserBookingHistory(userId) {
        if (!mongoose.isValidObjectId(userId)) throw Object.assign(new Error("Người dùng không hợp lệ."), { status: 400 });
        const bookings = await bookingRepository.findByUserId(userId);
        return bookings.map(booking => ({ ...booking.toObject(), equipmentItems: [] }));
    }

    async cancelBookingByUser(userId, bookingId, cancelReason) {
        return cancelCoreBooking(bookingId, { userId, reason: cancelReason });
    }

    async getAllAvailableEquipments() { return unavailable(); }
    async createPaymentIntent() { return unavailable(); }
    async verifyAndExecutePayment() { return unavailable(); }

    async autoCompletePastBookings() {
        if (maintenanceRunning) return;
        maintenanceRunning = true;
        try {
            const now = new Date();
            const date = new Date(+now + 7 * 3600000).toISOString().slice(0, 10);
            const time = new Date(+now + 7 * 3600000).toISOString().slice(11, 16);
            // A request never approved before its start cannot become a valid reservation later.
            await Booking.updateMany({ status: "PENDING", paymentStatus: "UNPAID", reservationState: { $nin: ["PREPARING", "FAILED"] },
                $or: [{ bookingDate: { $lt: date } }, { bookingDate: date, startTime: { $lte: time } }]
            }, { $set: { status: "CANCELLED", cancelReason: "Đơn chưa được xác nhận trước giờ chơi." } });
            await reconcileBookingReservations(now);
            const completed = await Booking.find({ status: "CONFIRMED", paymentStatus: "PAID",
                $or: [{ bookingDate: { $lt: date } }, { bookingDate: date, endTime: { $lte: time } }]
            }).select("_id").sort({ bookingDate: 1 }).limit(500).lean();
            for (const booking of completed) {
                try { await completeCoreBooking(booking._id); }
                catch (error) { console.error("[Booking maintenance]", error.message); }
            }
        } catch (error) { console.error("[Booking maintenance]", error.message); }
        finally { maintenanceRunning = false; }
    }
}

export default new BookingService();
