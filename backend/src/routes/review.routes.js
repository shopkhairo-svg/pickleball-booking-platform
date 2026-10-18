import express from "express";
import reviewController from "../controllers/review.controller.js";
import { verifyToken, requireAdmin } from "../middlewares/auth.middleware.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { uploadReviewCloud } from "../config/cloudinary.js";
import {
    createReviewValidator,
    handleValidationErrors,
    objectIdParamValidator,
    reviewStatusValidator
} from "../middlewares/validation.middleware.js";

const router = express.Router();

router.get(
    "/courts/:courtId",
    globalLimiter,
    objectIdParamValidator("courtId"),
    handleValidationErrors,
    reviewController.getCourtReviews
);

router.get(
    "/courts/:courtId/eligibility",
    globalLimiter,
    verifyToken,
    objectIdParamValidator("courtId"),
    handleValidationErrors,
    reviewController.getEligibility
);

router.post(
    "/",
    globalLimiter,
    verifyToken,
    // Upload tối đa 5 ảnh kèm review vào folder PickleballPro_Media/reviews/
    uploadReviewCloud.array("images", 5),
    createReviewValidator,
    handleValidationErrors,
    reviewController.createReview
);

router.get(
    "/my-booking/:bookingId",
    globalLimiter,
    verifyToken,
    objectIdParamValidator("bookingId"),
    handleValidationErrors,
    reviewController.getMyBookingReview
);

router.get(
    "/admin",
    globalLimiter,
    verifyToken,
    requireAdmin,
    reviewController.getAdminReviews
);

router.put(
    "/admin/:id/status",
    globalLimiter,
    verifyToken,
    requireAdmin,
    objectIdParamValidator("id"),
    reviewStatusValidator,
    handleValidationErrors,
    reviewController.updateReviewStatus
);

export default router;
