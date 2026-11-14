// src/routes/booking.routes.js (MÔI TRƯỜNG BACKEND)
import express from "express";
import bookingController from "../controllers/booking.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { bookingCreateValidator, handleValidationErrors, objectIdParamValidator } from "../middlewares/validation.middleware.js";
import { inDevelopment } from "../middlewares/development.middleware.js";

const router = express.Router();

router.use("/equipments", inDevelopment);
router.all(["/:id/payment-intent", "/:id/verify-payment"], inDevelopment);

// Cổng nổ đơn đặt lịch bắt buộc verify token
router.post("/", globalLimiter, verifyToken, bookingCreateValidator, handleValidationErrors, bookingController.createBooking);

router.get("/my-bookings", globalLimiter, verifyToken, bookingController.getHistory);

router.put("/:id/cancel", globalLimiter, verifyToken, objectIdParamValidator("id"), handleValidationErrors, bookingController.cancelBooking);

export default router;
