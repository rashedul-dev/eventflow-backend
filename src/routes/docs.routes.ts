// ============================================================================
// FILE: backend/src/routes/docs.routes.ts - API Documentation
// ============================================================================

import { swaggerSpec } from "@/config/swaggerDocs";
import { Router, type Request, type Response } from "express";
import swaggerUi from "swagger-ui-express";

const router = Router();

// Swagger UI
router.use("/", swaggerUi.serve);
router.get(
  "/",
  swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "EventFlow API Documentation",
  })
);

// OpenAPI JSON
router.get("/openapi.json", (_req: Request, res: Response) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

export default router;
