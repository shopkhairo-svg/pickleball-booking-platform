import express from "express";
import vendorController from "../controllers/vendor.controller.js";
import { verifyToken, requireVendor } from "../middlewares/auth.middleware.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { uploadCourtCloud } from "../config/cloudinary.js";
import { inDevelopment } from "../middlewares/development.middleware.js";

const router = express.Router();
router.use(["/equipments", "/import-orders", "/shippers", "/deliveries", "/maintenance", "/maintenance-staff"], inDevelopment);
router.all(["/bookings/:id/prepare", "/bookings/:id/return-equipment"], inDevelopment);

router.use(globalLimiter, verifyToken, requireVendor);

// Stats
router.get("/stats", vendorController.getStats);

// Courts
router.get("/courts", vendorController.getCourts);
router.get("/courts/:courtId/subcourts", vendorController.getSubCourts);
router.post("/courts/:courtId/subcourts", vendorController.createSubCourt);
router.put("/subcourts/:id", vendorController.updateSubCourt);
router.delete("/subcourts/:id", vendorController.deleteSubCourt);
router.post("/courts", uploadCourtCloud.array("images", 10), vendorController.createCourt);
router.put("/courts/:id", uploadCourtCloud.array("images", 10), vendorController.updateCourt);
router.delete("/courts/:id", vendorController.deleteCourt);

// Bookings
router.get("/bookings", vendorController.getBookings);

// Reviews
router.get("/reviews", vendorController.getReviews);

export default router;
