import express from "express";
import shipperController from "../controllers/shipper.controller.js";
import { verifyToken, requireShipper } from "../middlewares/auth.middleware.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { uploadDeliveryProofCloud } from "../config/cloudinary.js";

const router = express.Router();

router.use(globalLimiter, verifyToken, requireShipper);

router.get("/deliveries", shipperController.getMyDeliveries);
router.get("/deliveries/:id", shipperController.getDeliveryDetail);
router.put(
    "/deliveries/:id/status",
    uploadDeliveryProofCloud.single("proofImage"),
    shipperController.updateDeliveryStatus
);

export default router;
