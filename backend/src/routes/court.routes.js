// src/routes/court.routes.js
import express from "express";
import courtController from "../controllers/court.controller.js";
import courtInteractionController from "../controllers/courtInteraction.controller.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { optionalAuth, verifyToken } from "../middlewares/auth.middleware.js";
import { handleValidationErrors, objectIdParamValidator, recentViewQueryValidator } from "../middlewares/validation.middleware.js";

const router = express.Router();

// Lấy danh sách sân (Có bộ lọc nâng cao query parameters)
router.get("/", globalLimiter, (req, res) => courtController.getCourts(req, res));

router.get(
    "/me/favorites",
    globalLimiter,
    verifyToken,
    courtInteractionController.getFavorites
);

router.get(
    "/me/recently-viewed",
    globalLimiter,
    optionalAuth,
    recentViewQueryValidator,
    handleValidationErrors,
    courtInteractionController.getRecentlyViewed
);

router.get(
    "/:courtId/similar",
    globalLimiter,
    objectIdParamValidator("courtId"),
    handleValidationErrors,
    courtInteractionController.getSimilarCourts
);

router.post(
    "/:courtId/view",
    globalLimiter,
    optionalAuth,
    objectIdParamValidator("courtId"),
    handleValidationErrors,
    courtInteractionController.recordView
);

router.get(
    "/:courtId/favorite",
    globalLimiter,
    verifyToken,
    objectIdParamValidator("courtId"),
    handleValidationErrors,
    courtInteractionController.getFavoriteStatus
);

router.post(
    "/:courtId/favorite",
    globalLimiter,
    verifyToken,
    objectIdParamValidator("courtId"),
    handleValidationErrors,
    courtInteractionController.toggleFavorite
);

// Lấy chi tiết thông tin một cụm sân cụ thể dựa vào ID
router.get("/:id", globalLimiter, (req, res) => courtController.getCourtById(req, res));

export default router;
