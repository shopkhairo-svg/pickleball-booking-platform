import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "node:path";
import { getCorsOptions, handleCorsError } from "./config/cors.js";

import { connectDB } from "./config/db.js"; //
import authRoutes from "./routes/auth.routes.js";
import courtRoutes from "./routes/court.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import userRoutes from "./routes/user.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import vendorRoutes from "./routes/vendor.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import pointsRoutes from "./routes/points.routes.js";
import shipperRoutes from "./routes/shipper.routes.js";
import maintenanceStaffRoutes from "./routes/maintenanceStaff.routes.js";

import { developmentGate } from "./middlewares/development.middleware.js";
import { createApiDocsRouter } from "./docs/router.js";
import { startBookingReminders } from "./services/bookingReminder.service.js";
import Booking from "./models/booking.model.js";
import CourtSlot from "./models/courtSlot.model.js";

const app = express();
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);

app.use(cors(getCorsOptions()));
app.use(handleCorsError);
app.use(express.json());
app.use("/uploads", express.static(path.resolve("uploads"), { fallthrough: false, maxAge: "1d" }));

app.use("/api-docs", createApiDocsRouter());
app.use("/api", developmentGate);

// 1. Kết nối DB (Bắt buộc dùng await để đảm bảo DB sẵn sàng trước khi mở cổng)
await connectDB(); //
// Reservation correctness relies on unique request/slot indexes before accepting traffic.
await Promise.all([Booking.init(), CourtSlot.init()]);

import systemSettingService from "./services/systemSetting.service.js";
await systemSettingService.initializeSettings();

// ✅ Fix #5: Khởi động Slot Scheduler — tự động sinh slot rolling 30 ngày mỗi ngày
import { startSlotScheduler } from "./utils/slotScheduler.js";
startSlotScheduler();
startBookingReminders();

// Phục hồi giữ chỗ bị gián đoạn và hoàn tất các lượt đã thu tiền sau giờ chơi.
import bookingService from "./services/booking.service.js";
const runBookingCleanup = () => bookingService.autoCompletePastBookings().catch(error => {
    console.error("Booking cleanup failed:", error.message);
});
runBookingCleanup();
setInterval(runBookingCleanup, 60 * 1000);

// 2. Cấu hình các tuyến đường API
app.use("/api/auth", authRoutes);
app.use("/api/courts", courtRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/vendor", vendorRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/points", pointsRoutes);
app.use("/api/shipper", shipperRoutes);
app.use("/api/maintenance-staff", maintenanceStaffRoutes);

// 3. ĐÂY LÀ DÒNG QUAN TRỌNG: Giúp server treo liên tục để lắng nghe request từ Postman
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy liên tục tại cổng: http://localhost:${PORT}`);
});
