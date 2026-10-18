// src/routes/admin.routes.js
import express from "express";
import adminController from "../controllers/admin.controller.js";
import { verifyToken, requireAdmin } from "../middlewares/auth.middleware.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { uploadCourtCloud, uploadMaintenanceCloud } from "../config/cloudinary.js";

const router = express.Router();

// 🛡️ Tất cả route admin đều yêu cầu: đăng nhập + quyền ADMIN
router.use(globalLimiter, verifyToken, requireAdmin);

// ======================== COURTS ========================
router.get("/courts", adminController.getCourts);
router.get("/courts/:id", adminController.getCourtById);
router.get("/courts/:id/subcourts", adminController.getSubCourts);
router.post("/courts/:courtId/subcourts", adminController.createSubCourt);
router.put("/subcourts/:id", adminController.updateSubCourt);
router.delete("/subcourts/:id", adminController.deleteSubCourt);
router.post("/courts", uploadCourtCloud.array("images", 10), adminController.createCourt);
router.put("/courts/:id", uploadCourtCloud.array("images", 10), adminController.updateCourt);
router.delete("/courts/:id", adminController.deleteCourt);
router.put("/courts/:id/block", adminController.blockCourt);
// Route xóa 1 ảnh cụ thể — publicId được encodeURIComponent ở client nên không có slash thật
router.delete("/courts/:id/images/:publicId", adminController.deleteCourtImage);

// ======================== BOOKINGS ========================
router.get("/bookings", adminController.getAllBookings);
router.put("/bookings/:id/confirm", adminController.confirmBooking);
router.put("/bookings/:id/complete", adminController.completeBooking);
router.put("/bookings/:id/cancel", adminController.cancelBooking);

// ======================== EQUIPMENT ========================
router.get("/equipments", adminController.getAllEquipments);
router.post("/equipments", uploadCourtCloud.single("image"), adminController.createEquipment);
router.put("/equipments/:id", uploadCourtCloud.single("image"), adminController.updateEquipment);
router.delete("/equipments/:id", adminController.deleteEquipment);
router.put("/equipments/:id/stock-in", adminController.stockIn);
router.get("/equipments/:id/rentals", adminController.getEquipmentRentals);

// ======================== IMPORT ORDERS ========================
router.post("/import-orders", adminController.createImportOrder);
router.get("/import-orders", adminController.getImportOrders);
router.put("/import-orders/:id/cancel", adminController.cancelImportOrder);

// ======================== MAINTENANCE ========================
router.get("/maintenance", adminController.getAllMaintenance);
router.post("/maintenance", uploadMaintenanceCloud.array("images", 5), adminController.createMaintenance);
router.put("/maintenance/:id/status", adminController.updateMaintenanceStatus);

// ======================== ANALYTICS ========================
router.get("/analytics/dashboard", adminController.getDashboardStats);
router.get("/analytics/revenue", adminController.getRevenueStats);
router.get("/analytics/equipment-stats", adminController.getEquipmentStats);
router.get("/analytics/peak-hours", adminController.getPeakHours);

// ======================== SETTINGS ========================
router.get("/settings", adminController.getSettings);
router.put("/settings", adminController.updateSettings);

// ======================== USERS ========================
router.get("/users", adminController.getAllUsers);
router.get("/users/:id", adminController.getUserDetail);
router.put("/users/:id/toggle-status", adminController.toggleUserStatus);
router.put("/users/:id/role", adminController.updateUserRole);

export default router;
