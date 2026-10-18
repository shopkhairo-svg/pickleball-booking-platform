import { rateLimit } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../config/redis.js";

/**
 * 1. Global Limiter: Giới hạn chung cho toàn bộ các API để chống spam / DDOS cơ bản
 * Tối đa 100 request từ 1 địa chỉ IP trong vòng 1 phút.
 */
export const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // Khoảng thời gian: 1 phút
    limit: 100, // Giới hạn 100 requests
    standardHeaders: "draft-7", // Trả về thông tin giới hạn trong header chuẩn (RateLimit-Limit, RateLimit-Remaining)
    legacyHeaders: false, // Vô hiệu hóa các header cũ lỗi thời (X-RateLimit-*)

    // Định nghĩa lưu trữ bộ đếm tập trung trên Redis
    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: "rl:global:", // Tiền tố phân biệt key trong Redis
    }),

    message: {
        success: false,
        status: 429,
        message: "Hệ thống ghi nhận quá nhiều yêu cầu từ bạn. Vui lòng chậm lại và thử lại sau 1 phút!",
    },
});

/**
 * 2. Auth Limiter: Bảo vệ nghiêm ngặt các API nhạy cảm (Login, Register, Google Login)
 * Tối đa 5 lần thử từ 1 địa chỉ IP trong vòng 15 phút để chống tấn công Brute Force dò mật khẩu.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // Khoảng thời gian: 15 phút
    limit: 1000, // Giới hạn tối đa 5 lần gửi request
    standardHeaders: "draft-7",
    legacyHeaders: false,

    store: new RedisStore({
        sendCommand: (...args) => redisClient.call(...args),
        prefix: "rl:auth:", // Tiền tố lưu trữ riêng cho cụm Auth trong Redis
    }),

    message: {
        success: false,
        status: 429,
        message: "Bạn đã thực hiện hành động này quá nhiều lần liên tiếp. Để bảo mật hệ thống, vui lòng thử lại sau 15 phút!",
    },
});