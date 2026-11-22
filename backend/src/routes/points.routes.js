import express from "express";
import pointsController from "../controllers/points.controller.js";
import { verifyToken } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/wallet", verifyToken, pointsController.getWallet);
export default router;
