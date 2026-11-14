import "dotenv/config";

import express from "express";
import cors from "cors";

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
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { startBookingReminders } from "./services/bookingReminder.service.js";
import Booking from "./models/booking.model.js";
import CourtSlot from "./models/courtSlot.model.js";

const app = express();
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);

// ✅ Fix #13: CORS whitelist theo FRONTEND_URL env var, không mở cho mọi origin
// Trong production: set FRONTEND_URL=https://your-domain.com
// Trong dev: localhost:5173 vẫn hoạt động
const allowedOrigins = [
    process.env.FRONTEND_URL || "http://localhost:5173",
    "http://localhost:5173",
    "http://localhost:3000"
];

app.use(cors({
    origin: (origin, callback) => {
        // Cho phép request không có origin (Postman, server-to-server, mobile app)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS: Origin ${origin} không được phép truy cập API!`));
    },
    credentials: true // Cho phép gửi cookie (cần cho httpOnly refreshToken sau này)
}));
app.use(express.json());

// ---------- Swagger setup ----------
const swaggerDefinition = {
  openapi: "3.0.0",
  info: {
    title: "Pickleball Booking System API",
    version: "1.0.0",
    description: "Auto‑generated API documentation using swagger-jsdoc",
  },
  servers: [{ url: "/api" }],
};
const swaggerOptions = {
  swaggerDefinition,
  // Look for JSDoc comments in all route files
  apis: ["./src/routes/*.js"],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// -----------------------------------
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
