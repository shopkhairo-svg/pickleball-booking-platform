// src/routes/court.routes.js
import express from "express";
import courtController from "../controllers/court.controller.js";
import courtInteractionController from "../controllers/courtInteraction.controller.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { optionalAuth, verifyToken } from "../middlewares/auth.middleware.js";
import { handleValidationErrors, objectIdParamValidator, recentViewQueryValidator } from "../middlewares/validation.middleware.js";

const router = express.Router();

// Lấy danh sách sân (Có bộ lọc nâng cao query parameters)
/**
 * @swagger
 * /courts:
 *   get:
 *     summary: Retrieve list of courts with advanced filters
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Court type (INDOOR or OUTDOOR)
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location filter (partial match)
 *       - in: query
 *         name: locationId
 *         schema: { type: string }
 *         description: Selected area ID from /courts/locations. Takes precedence over location text and includes the parent province.
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for name, location, address
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price per hour
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price per hour
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Only courts with a future free slot on this Vietnam calendar date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Pagination page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of courts with pagination info
 */
router.get("/", globalLimiter, (req, res) => courtController.getCourts(req, res));
/**
 * @swagger
 * /courts/locations:
 *   get:
 *     summary: Suggest Vietnamese areas and public court addresses
 *     description: Local administrative catalogue including labelled legacy districts, plus addresses of available courts. Suggestions do not imply court availability and do not use Google Places.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string, maxLength: 120 }
 *         description: Accent-insensitive search text; empty returns initial suggestions.
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 15, default: 8 }
 *     responses:
 *       200: { description: Suggestions with id, label, value, description, source and optional locationId or courtCount }
 *       400: { description: Invalid search text or limit }
 *       503: { description: Court address lookup temporarily unavailable }
 */
router.get("/locations", globalLimiter, (req, res) => courtController.getLocations(req, res));
/**
 * @swagger
 * /courts/nearby:
 *   get:
 *     summary: Find available courts within a distance of a geographic point
 *     description: Returns courts with coordinates and at least one future free slot for the selected date. Distance is in kilometers.
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema: { type: number, minimum: -90, maximum: 90 }
 *       - in: query
 *         name: lng
 *         required: true
 *         schema: { type: number, minimum: -180, maximum: 180 }
 *       - in: query
 *         name: radius
 *         schema: { type: number, minimum: 0, maximum: 100, default: 5 }
 *       - in: query
 *         name: date
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INDOOR, OUTDOOR] }
 *     responses:
 *       200: { description: Available courts sorted by distance }
 *       400: { description: Invalid coordinates, date or filters }
 */
// Nearby must be registered before /:id.
router.get('/nearby', globalLimiter, (req, res) => courtController.getNearbyCourts(req, res));


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
