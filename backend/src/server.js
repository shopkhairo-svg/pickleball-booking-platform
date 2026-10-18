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

const app = express();

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

// 1. Kết nối DB (Bắt buộc dùng await để đảm bảo DB sẵn sàng trước khi mở cổng)
await connectDB(); //

import systemSettingService from "./services/systemSetting.service.js";
await systemSettingService.initializeSettings();

// ✅ Fix #5: Khởi động Slot Scheduler — tự động sinh slot rolling 30 ngày mỗi ngày
import { startSlotScheduler } from "./utils/slotScheduler.js";
startSlotScheduler();

// Tự động quét và hoàn tất các booking đã qua giờ chơi + cập nhật trả thiết bị định kỳ
import bookingService from "./services/booking.service.js";
bookingService.autoCompletePastBookings(); // Quét ngay khi khởi động
setInterval(() => {
    bookingService.autoCompletePastBookings();
}, 5 * 60 * 1000); // Quét định kỳ mỗi 5 phút

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
