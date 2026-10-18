// src/controllers/booking.controller.js (MÔI TRƯỜNG BACKEND)
import bookingService from "../services/booking.service.js";

class BookingController {
    /**
     * API: GET /api/bookings/equipments?courtId=xxx (Lấy đồ cho khách chọn thuê)
     * ✅ Fix #10: Đọc courtId từ query để lọc thiết bị đúng theo sân
     */
    async getEquipments(req, res) {
        try {
            const { courtId } = req.query; // courtId là optional, nếu không có thì lấy tất cả
            const equipments = await bookingService.getAllAvailableEquipments(courtId || null);
            return res.status(200).json({
                success: true,
                equipments
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }

    /**
     * API: POST /api/bookings (Đặt sân + Đồ đi kèm)
     */
    async createBooking(req, res) {
        try {
            const userId = req.user.id;
            const result = await bookingService.createNewBooking(userId, req.body);

            return res.status(201).json({
                success: true,
                ...result
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * API: GET /api/bookings/my-booking
     */
    async getHistory(req, res) {
        try {
            const userId = req.user.id; // Bốc từ chiếc khiên verifyToken
            const bookings = await bookingService.getUserBookingHistory(userId);

            return res.status(200).json({
                success: true,
                count: bookings.length,
                bookings
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * API: PUT /api/bookings/:id/cancel
     */
    async cancelBooking(req, res) {
        try {
            const userId = req.user.id; // Lấy từ verifyToken
            const bookingId = req.params.id; // Lấy mã ID đơn hàng từ URL
            const { cancelReason } = req.body;

            const result = await bookingService.cancelBookingByUser(userId, bookingId, cancelReason);

            return res.status(200).json({
                success: true,
                ...result
            });
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    }
    /**
     * API: GET /api/bookings/:id/payment-intent
     */
    async getPaymentIntent(req, res) {
        try {
            const userId = req.user.id;
            const bookingId = req.params.id;

            const result = await bookingService.createPaymentIntent(userId, bookingId);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }

    /**
     * API: POST /api/bookings/:id/verify-payment
     */
    async confirmPayment(req, res) {
        try {
            const userId = req.user.id;
            const bookingId = req.params.id;
            const { paymentMethod } = req.body; // MOMO hoặc BANKING

            const result = await bookingService.verifyAndExecutePayment(userId, bookingId, paymentMethod);
            return res.status(200).json({ success: true, ...result });
        } catch (error) {
            return res.status(400).json({ success: false, message: error.message });
        }
    }
}

export default new BookingController();