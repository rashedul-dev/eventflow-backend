// ============================================================================
// FILE: backend/src/routes/health.routes.ts - Enhanced Health Checks
// ============================================================================

import { Router, type Request, type Response } from "express";
import { prisma, checkDatabaseHealth } from "../shared/prisma";
import { checkStripeHealth } from "../shared/stripe";
import { logger } from "../utils/logger";

const router = Router();

/**
 * Basic health check
 */
router.get("/", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: "1.0.0",
  });
});

/**
 * Detailed health check with all services
 */
router.get("/detailed", async (_req: Request, res: Response) => {
  try {
    const [dbHealth, stripeHealth] = await Promise.all([checkDatabaseHealth(), checkStripeHealth()]);

    const allHealthy = dbHealth.connected && (stripeHealth.connected || !process.env.STRIPE_SECRET_KEY);

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: {
          status: dbHealth.connected ? "connected" : "disconnected",
          latency: dbHealth.latency ? `${dbHealth.latency}ms` : undefined,
          error: dbHealth.error,
        },
        stripe: {
          status: stripeHealth.connected ? "connected" : "not_configured",
          error: stripeHealth.error,
        },
      },
      memory: {
        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
      },
      cpu: {
        usage: process.cpuUsage(),
      },
    });
  } catch (error) {
    logger.error("Health check failed:", error);
    res.status(503).json({
      status: "unhealthy",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * Readiness probe (for Kubernetes)
 */
router.get("/ready", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false });
  }
});

/**
 * Liveness probe (for Kubernetes)
 */
router.get("/live", (_req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});

/**
 * Database connection test
 */
router.get("/db", async (_req: Request, res: Response) => {
  try {
    const result = await checkDatabaseHealth();
    res.status(result.connected ? 200 : 503).json(result);
  } catch (error) {
    res.status(503).json({
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export default router;
