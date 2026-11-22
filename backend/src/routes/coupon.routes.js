import express from "express";
import couponController from "../controllers/coupon.controller.js";
import { verifyToken, requireAdmin } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.use(verifyToken);
router.get("/available", couponController.getAvailableCoupons);
router.post("/validate", couponController.validateCoupon);
router.get("/admin", requireAdmin, couponController.getAdminCoupons);
router.post("/admin", requireAdmin, couponController.createCoupon);
router.put("/admin/:id", requireAdmin, couponController.updateCoupon);
router.delete("/admin/:id", requireAdmin, couponController.deleteCoupon);
export default router;
