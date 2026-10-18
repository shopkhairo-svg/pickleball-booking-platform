import express from "express";
import couponController from "../controllers/coupon.controller.js";
import { verifyToken, requireAdmin } from "../middlewares/auth.middleware.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";
import {
    couponAdminValidator,
    handleValidationErrors,
    objectIdParamValidator,
    validateCouponValidator
} from "../middlewares/validation.middleware.js";

const router = express.Router();

router.get("/available", globalLimiter, verifyToken, couponController.getAvailableCoupons);
router.post(
    "/validate",
    globalLimiter,
    verifyToken,
    validateCouponValidator,
    handleValidationErrors,
    couponController.validateCoupon
);

router.get("/admin", globalLimiter, verifyToken, requireAdmin, couponController.getAdminCoupons);
router.post(
    "/admin",
    globalLimiter,
    verifyToken,
    requireAdmin,
    couponAdminValidator,
    handleValidationErrors,
    couponController.createCoupon
);
router.put(
    "/admin/:id",
    globalLimiter,
    verifyToken,
    requireAdmin,
    objectIdParamValidator("id"),
    handleValidationErrors,
    couponController.updateCoupon
);
router.delete(
    "/admin/:id",
    globalLimiter,
    verifyToken,
    requireAdmin,
    objectIdParamValidator("id"),
    handleValidationErrors,
    couponController.deleteCoupon
);

export default router;
