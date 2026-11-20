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

// Public community feed. Only approved, booking-verified reviews are returned.
/**
 * @swagger
 * /reviews:
 *   get:
 *     summary: Browse approved, booking-verified court reviews
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 30, default: 12 }
 *       - in: query
 *         name: courtId
 *         schema: { type: string }
 *       - in: query
 *         name: rating
 *         schema: { type: integer, minimum: 1, maximum: 5 }
 *       - in: query
 *         name: withPhotos
 *         schema: { type: boolean }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [newest, top], default: newest }
 *     responses:
 *       200: { description: Paginated approved reviews with player and court details }
 *       400: { description: Invalid filter }
 */
router.get(
    "/",
    globalLimiter,
    reviewController.getCommunityReviews
);

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
