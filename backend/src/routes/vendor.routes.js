import express from "express";
import vendorController from "../controllers/vendor.controller.js";
import { verifyToken, requireVendor } from "../middlewares/auth.middleware.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { uploadCourtCloud } from "../config/cloudinary.js";

const router = express.Router();

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

// Equipments
router.get("/equipments", vendorController.getEquipments);
router.post("/equipments", vendorController.createEquipment);
router.put("/equipments/:id", vendorController.updateEquipment);
router.delete("/equipments/:id", vendorController.deleteEquipment);
router.get("/equipments/:id/rentals", vendorController.getEquipmentRentals);

// Bookings
router.get("/bookings", vendorController.getBookings);
router.put("/bookings/:id/prepare", vendorController.prepareBooking);
router.put("/bookings/:id/return-equipment", vendorController.returnEquipment);

// Reviews
router.get("/reviews", vendorController.getReviews);

// Import Orders
router.get("/import-orders", vendorController.getImportOrders);
router.put("/import-orders/:id/confirm", vendorController.confirmImportOrder);
router.put("/import-orders/:id/complete", vendorController.completeImportOrder);
router.put("/import-orders/:id/cancel", vendorController.cancelImportOrder);
router.get("/shippers", vendorController.getShippers);
router.put("/import-orders/:id/assign-shipper", vendorController.assignShipper);
router.put("/deliveries/:id/confirm-completed", vendorController.confirmDeliveryCompleted);

// Maintenance
router.get("/maintenance", vendorController.getVendorMaintenance);
router.get("/maintenance-staff", vendorController.getMaintenanceStaff);
router.put("/maintenance/:id/assign-staff", vendorController.assignMaintenanceStaff);
router.put("/maintenance/:id/status", vendorController.updateVendorMaintenanceStatus);

export default router;
