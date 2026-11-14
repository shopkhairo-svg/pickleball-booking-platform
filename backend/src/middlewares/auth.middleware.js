// src/middlewares/auth.middleware.js
import redisClient from "../config/redis.js";
// Import file tiện ích
import jwtUtil from "../utils/jwt.util.js";
import userRepository from "../repositories/user.repository.js";

const bearerToken = req => /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "")?.[1];

async function authenticateToken(token) {
    if (typeof token !== "string" || !token) {
        throw Object.assign(new Error("Không tìm thấy token xác thực!"), { status: 401 });
    }
    let decoded;
    try {
        decoded = jwtUtil.verifyAccessToken(token);
    } catch {
        throw Object.assign(new Error("Token đã hết hạn hoặc không hợp lệ!"), { status: 401 });
    }
    if (await redisClient.get(`blacklist:${token}`)) {
        throw Object.assign(new Error("Phiên đăng nhập này đã kết thúc!"), { status: 401 });
    }
    // Roles and account state can change while an issued JWT is still valid.
    const user = await userRepository.findById(decoded.id);
    if (!user) throw Object.assign(new Error("Tài khoản không còn tồn tại!"), { status: 401 });
    if (user.status !== "ACTIVE") {
        throw Object.assign(new Error("Tài khoản của bạn hiện đang bị khóa!"), { status: 403 });
    }
    return { ...decoded, id: String(user._id), role: user.role, vendorType: user.vendorType };
}

/**
 * Middleware chặn quyền truy cập: Chỉ cho phép role ADMIN đi qua
 * Phải đặt SAU verifyToken trong chuỗi middleware
 */
export const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "ADMIN") {
        return res.status(403).json({
            success: false,
            message: "Bạn không có quyền truy cập khu vực quản trị!"
        });
    }
    next();
};

export const requireVendor = (req, res, next) => {
    if (!req.user || !["VENDOR", "ADMIN"].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: "Bạn không có quyền truy cập khu vực dành cho nhà cung cấp!"
        });
    }
    if (req.user.role === "VENDOR" && req.user.vendorType !== "COURT") {
        return res.status(501).json({
            success: false,
            code: "FEATURE_IN_DEVELOPMENT",
            message: "Tính năng nhà cung cấp dụng cụ đang trong giai đoạn phát triển."
        });
    }
    next();
};

export const requireShipper = (req, res, next) => {
    if (!req.user || !["SHIPPER", "ADMIN"].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: "Bạn không có quyền truy cập khu vực dành cho người giao hàng!"
        });
    }
    next();
};

export const requireMaintenanceStaff = (req, res, next) => {
    if (!req.user || !["MAINTENANCE_STAFF", "ADMIN"].includes(req.user.role)) {
        return res.status(403).json({
            success: false,
            message: "Bạn không có quyền truy cập khu vực dành cho thợ bảo trì!"
        });
    }
    next();
};



export const verifyToken = async (req, res, next) => {
    try {
        req.user = await authenticateToken(bearerToken(req));
    } catch (error) {
        return res.status(error.status || 503).json({ success: false, message: error.status ? error.message : "Tạm thời không thể kiểm tra quyền truy cập!" });
    }
    return next();
};

export const optionalAuth = async (req, res, next) => {
    req.user = null;
    try {
        const token = bearerToken(req);
        if (token) req.user = await authenticateToken(token);
    } catch {
        req.user = null;
    }
    return next();
};

export const verifyStreamToken = async (req, res, next) => {
    try {
        req.user = await authenticateToken(req.query.token);
    } catch (error) {
        return res.status(error.status || 503).json({ success: false, message: error.status ? error.message : "Tạm thời không thể kiểm tra phiên realtime!" });
    }
    return next();
};
