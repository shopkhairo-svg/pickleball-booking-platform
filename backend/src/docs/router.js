import { Router } from "express";
import { fileURLToPath } from "node:url";
import swaggerUi from "swagger-ui-express";
import { openapiSpec } from "./openapi.js";
import { swaggerUiOptions } from "./swagger-ui.js";

export function createApiDocsRouter() {
    const router = Router();
    router.get("/favicon.svg", (_req, res) => res.sendFile(fileURLToPath(new URL("./assets/favicon.svg", import.meta.url)), { maxAge: 0 }));
    router.get("/favicon.LICENSE.txt", (_req, res) => res.sendFile(fileURLToPath(new URL("./assets/favicon.LICENSE.txt", import.meta.url)), { maxAge: 0 }));
    router.get("/openapi.json", (_req, res) => res.json(openapiSpec));
    router.use(swaggerUi.serve, swaggerUi.setup(openapiSpec, swaggerUiOptions));
    return router;
}
