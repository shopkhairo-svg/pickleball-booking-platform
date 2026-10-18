import express from "express";
import authController from "../controllers/auth.controller.js";

// Nhập các tấm khiên bảo vệ từ tầng Middlewares đã viết
import { verifyToken } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimiter.middleware.js";
import { loginValidator,registerValidator, handleValidationErrors, forgotPasswordValidator, resetPasswordValidator } from "../middlewares/validation.middleware.js";

const router = express.Router();

/**
 * Endpoint: POST /api/auth/login
 * Full luồng: Chặn Spam IP -> Kiểm tra định dạng đầu vào -> Xử lý kiểm tra DB & Cấp phát JWT Tokens
 */
router.post(
    "/login",
    authLimiter,
    loginValidator,
    handleValidationErrors,
    (req, res) => authController.login(req, res)
);

/**
 * Endpoint: POST /api/auth/google-login
 */
router.post(
    "/google-login",
    authLimiter,
    (req, res) => authController.googleLogin(req, res)
);

/**
 * Endpoint: POST /api/auth/register
 * Luồng đi: Chặn Spam IP -> Kiểm tra định dạng đầu vào -> Trích xuất lỗi -> Tiến hành tạo User & Cấp phát Token
 */
router.post(
    "/register",
    authLimiter,
    registerValidator,
    handleValidationErrors,
    (req, res) => authController.register(req, res)
);

router.post("/verify-otp", handleValidationErrors,
    (req, res) => authController.verifyOTP(req, res)
);

/**
 * Endpoint: POST /api/auth/logout
 * Yêu cầu: Bắt buộc phải có Access Token hợp lệ đi qua verifyToken mới cho đăng xuất phiên
 */
router.post(
    "/logout",
    verifyToken,
    (req, res) => authController.logout(req, res)
);

/**
 * Endpoint: POST /api/auth/forgot-password
 * Luồng đi: Chặn Spam IP -> Validate định dạng Email -> Trích xuất lỗi -> Tạo mã bảo mật ngầm trên Redis
 */
router.post(
    "/forgot-password",
    authLimiter,
    forgotPasswordValidator,
    handleValidationErrors,
    (req, res) => authController.forgotPassword(req, res)
);

/**
 * Endpoint: PUT /api/auth/reset-password
 * Luồng đi: Chặn Spam IP -> Kiểm tra tính hợp lệ dữ liệu -> Check chéo Redis -> Cập nhật mật khẩu Mongoose
 */
router.put(
    "/reset-password",
    authLimiter,
    resetPasswordValidator,
    handleValidationErrors,
    (req, res) => authController.resetPassword(req, res)
);

/**
 * Endpoint: POST /api/auth/refresh-token
 */
router.post(
    "/refresh-token",
    (req, res) => authController.refreshToken(req, res)
);

export default router;