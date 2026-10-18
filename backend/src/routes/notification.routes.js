import express from "express";
import notificationController from "../controllers/notification.controller.js";
import { verifyToken, verifyStreamToken } from "../middlewares/auth.middleware.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { handleValidationErrors, objectIdParamValidator } from "../middlewares/validation.middleware.js";

const router = express.Router();

router.get("/stream", verifyStreamToken, (req, res) => notificationController.stream(req, res));
router.get("/", globalLimiter, verifyToken, notificationController.getNotifications);
router.put("/read-all", globalLimiter, verifyToken, notificationController.markAllRead);
router.put(
    "/:id/read",
    globalLimiter,
    verifyToken,
    objectIdParamValidator("id"),
    handleValidationErrors,
    notificationController.markRead
);
router.delete(
    "/:id",
    globalLimiter,
    verifyToken,
    objectIdParamValidator("id"),
    handleValidationErrors,
    notificationController.deleteNotification
);

export default router;
