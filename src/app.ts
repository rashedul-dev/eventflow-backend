import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
// import rateLimit from "express-rate-limit";
import { config } from "./config";
import { logger } from "./utils/logger";
import paymentRoutes from "./app/modules/payment/payment.routes";

import globalErrorHandler from "./app/middlewares/globalErrorHandler";
import notFound from "./app/middlewares/notFound";

// Import routes
import healthRoutes from "./routes/health.routes";
import authRoutes from "./app/modules/auth/auth.routes";
import userRoutes from "./app/modules/user/user.routes";
import eventRoutes from "./app/modules/event/event.routes";
import ticketRoutes from "./app/modules/ticket/ticket.routes";
import adminRoutes from "./app/modules/admin/admin.routes";
import notificationRoutes from "./app/modules/notification/notification.routes";
import analyticsRoutes from "./app/modules/analytics/analytics.routes";
import docsRoutes from "./routes/docs.routes";

// Create Express application
const createApp = (): Express => {
  const app = express();

  // Trust proxy for rate limiting behind reverse proxy
  app.set("trust proxy", 1);

  // Security middleware
  app.use(
    helmet({
      contentSecurityPolicy: config.isProduction,
      crossOriginEmbedderPolicy: config.isProduction,
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: config.corsOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    })
  );

  // Rate limiting
  // const limiter = rateLimit({
  //   windowMs: config.rateLimit.windowMs,
  //   max: config.rateLimit.max,
  //   message: {
  //     success: false,
  //     message: "Too many requests, please try again later.",
  //   },
  //   standardHeaders: true,
  //   legacyHeaders: false,
  // });
  // app.use(limiter);

  app.use("/api/v1/payments/webhook", express.raw({ type: "application/json" }));

  // Body parsing middleware
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  // Payment routes
  app.use("/api/v1/payments", paymentRoutes);

  // Request logging
  app.use(
    morgan(config.isDevelopment ? "dev" : "combined", {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
      skip: (req) => req.url === "/api/v1/health" || req.url === "/api/v1/health/liveness",
    })
  );

  // API Routes
  app.use("/api/v1/health", healthRoutes);
  app.use("/api/v1/auth", authRoutes);
  app.use("/api/v1/users", userRoutes);
  app.use("/api/v1/events", eventRoutes);
  app.use("/api/v1/tickets", ticketRoutes);
  app.use("/api/v1/admin", adminRoutes);
  app.use("/api/v1/notifications", notificationRoutes);
  app.use("/api/v1/analytics", analyticsRoutes);
  app.use("/api/v1/docs", docsRoutes);

  // Root endpoint
  app.get("/", (_req: Request, res: Response) => {
    res.json({
      name: "EventFlow API",
      version: "1.0.0",
      status: "running",
      environment: config.nodeEnv,
      timestamp: new Date().toISOString(),
    });
  });

  // API info endpoint
  app.get("/api", (_req: Request, res: Response) => {
    res.json({
      name: "EventFlow API",
      version: "1.0.0",
      documentation: "/api/v1/docs",
      health: "/api/v1/health",
      routes: {
        auth: "/api/v1/auth",
        users: "/api/v1/users",
        events: "/api/v1/events",
        tickets: "/api/v1/tickets",
      },
    });
  });

  // 404 handler
  app.use(notFound);

  // Global error handler
  app.use(globalErrorHandler);

  return app;
};

export const app = createApp();
export default app;
