// src/middlewares/auth.middleware.js
import redisClient from "../config/redis.js";
// Import file tiện ích
import jwtUtil from "../utils/jwt.util.js";

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
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({ success: false, message: "Không tìm thấy token xác thực!" });
        }

        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) {
            return res.status(401).json({ success: false, message: "Phiên đăng nhập này đã kết thúc!" });
        }

        // Sử dụng khối kiểm tra của jwtUtil gọn gàng
        try {
            const decoded = jwtUtil.verifyAccessToken(token);
            req.user = decoded;
            next();
        } catch (err) {
            return res.status(403).json({ success: false, message: "Token đã hết hạn hoặc không hợp lệ!" });
        }

    } catch (error) {
        return res.status(500).json({ success: false, message: "Lỗi hệ thống khi kiểm tra quyền truy cập!" });
    }
};

export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) return next();

        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) return next();

        try {
            req.user = jwtUtil.verifyAccessToken(token);
        } catch (err) {
            req.user = null;
        }

        return next();
    } catch (error) {
        req.user = null;
        return next();
    }
};

export const verifyStreamToken = async (req, res, next) => {
    try {
        const token = req.query.token;
        if (!token) {
            return res.status(401).json({ success: false, message: "Thiếu token realtime!" });
        }

        const isBlacklisted = await redisClient.get(`blacklist:${token}`);
        if (isBlacklisted) {
            return res.status(401).json({ success: false, message: "Phiên realtime đã hết hạn!" });
        }

        req.user = jwtUtil.verifyAccessToken(token);
        return next();
    } catch (error) {
        return res.status(403).json({ success: false, message: "Token realtime không hợp lệ!" });
    }
};
