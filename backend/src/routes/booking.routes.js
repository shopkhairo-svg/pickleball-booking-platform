// src/routes/booking.routes.js (MÔI TRƯỜNG BACKEND)
import express from "express";
import bookingController from "../controllers/booking.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { bookingCreateValidator, handleValidationErrors } from "../middlewares/validation.middleware.js";

const router = express.Router();

// 🎯 Cổng lấy đồ thuê công khai, khách vãng lai hay thành viên đều coi được
router.get("/equipments", globalLimiter, bookingController.getEquipments);

// Cổng nổ đơn đặt lịch bắt buộc verify token
router.post("/", globalLimiter, verifyToken, bookingCreateValidator, handleValidationErrors, bookingController.createBooking);

router.get("/my-bookings", globalLimiter, verifyToken, bookingController.getHistory);

router.get("/:id/payment-intent", globalLimiter, verifyToken, bookingController.getPaymentIntent);

// 🎯 Bấm nút xác nhận quét mã thành công để chuyển trạng thái PAID
router.post("/:id/verify-payment", globalLimiter, verifyToken, bookingController.confirmPayment);

router.put("/:id/cancel", globalLimiter, verifyToken, bookingController.cancelBooking);

export default router;
