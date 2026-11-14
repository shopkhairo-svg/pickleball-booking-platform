import express from "express";
import { inDevelopment } from "../middlewares/development.middleware.js";

// Intentionally inactive: no business controllers, uploads or database calls.
const router = express.Router();
router.use(inDevelopment);
export default router;
