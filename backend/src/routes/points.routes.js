import express from "express";
import pointsController from "../controllers/points.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";
import { globalLimiter } from "../middlewares/rateLimiter.middleware.js";

const router = express.Router();

router.get("/wallet", globalLimiter, verifyToken, pointsController.getWallet);

export default router;
