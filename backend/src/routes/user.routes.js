// src/routes/user.routes.js (MÔI TRƯỜNG BACKEND)
import express from "express";
import userController from "../controllers/user.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import {uploadAvatarCloud} from "../config/cloudinary.js"; // Middleware Multer Cloudinary của bạn
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = express.Router();

// 1. Tuyến đường lấy thông tin cá nhân
router.get("/profile", globalLimiter, verifyToken, userController.getProfile);

// 2. Tuyến đường cập nhật thông tin + Upload 1 ảnh Avatar lên Cloudinary
router.put("/profile", globalLimiter, verifyToken, uploadAvatarCloud.single("avatar"), userController.updateProfile);

export default router;