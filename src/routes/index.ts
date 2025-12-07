// ============================================================================
// FILE: backend/src/routes/index.ts - Main Routes Aggregator
// ============================================================================

import { Router, type Request, type Response } from "express";
import authRoutes from "../app/modules/auth/auth.routes";
import userRoutes from "../app/modules/user/user.routes";
import eventRoutes from "../app/modules/event/event.routes";
import ticketRoutes from "../app/modules/ticket/ticket.routes";
import paymentRoutes from "../app/modules/payment/payment.routes";
import adminRoutes from "../app/modules/admin/admin.routes";
import notificationRoutes from "../app/modules/notification/notification.routes";
import analyticsRoutes from "../app/modules/analytics/analytics.routes";
import healthRoutes from "./health.routes";
import docsRoutes from "./docs.routes";

const router = Router();

// ============================================================================
// API Routes v1
// ============================================================================

const apiRoutes = [
  {
    path: "/health",
    route: healthRoutes,
  },
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/events",
    route: eventRoutes,
  },
  {
    path: "/tickets",
    route: ticketRoutes,
  },
  {
    path: "/payments",
    route: paymentRoutes,
  },
  {
    path: "/admin",
    route: adminRoutes,
  },
  {
    path: "/notifications",
    route: notificationRoutes,
  },
  {
    path: "/analytics",
    route: analyticsRoutes,
  },
  {
    path: "/docs",
    route: docsRoutes,
  },
];

// Mount all routes
apiRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

// API root endpoint
router.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "EventFlow API",
    version: "1.0.0",
    description: "Event Management Platform API",
    documentation: "/api/v1/docs",
    health: "/api/v1/health",
    routes: {
      auth: "/api/v1/auth",
      users: "/api/v1/users",
      events: "/api/v1/events",
      tickets: "/api/v1/tickets",
      payments: "/api/v1/payments",
      admin: "/api/v1/admin",
      notifications: "/api/v1/notifications",
      analytics: "/api/v1/analytics",
    },
  });
});

export default router;
