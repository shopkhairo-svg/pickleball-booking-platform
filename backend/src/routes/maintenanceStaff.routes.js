import express from "express";
import maintenanceStaffController from "../controllers/maintenanceStaff.controller.js";
import { uploadMaintenanceCloud } from "../config/cloudinary.js";
import { verifyToken, requireMaintenanceStaff } from "../middlewares/auth.middleware.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = express.Router();

router.use(globalLimiter, verifyToken, requireMaintenanceStaff);

router.get("/maintenance", maintenanceStaffController.getAssignedMaintenance);
router.put(
    "/maintenance/:id/progress",
    uploadMaintenanceCloud.array("images", 5),
    maintenanceStaffController.updateProgress
);

export default router;
