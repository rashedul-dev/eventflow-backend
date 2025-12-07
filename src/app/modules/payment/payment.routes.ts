// ============================================================================
// FILE: backend/src/app/modules/payment/payment.routes.ts
// ============================================================================

import { Router } from "express";
import express from "express";
import { PaymentController } from "./payment.controller";
import { handleStripeWebhook, testWebhook } from "./payment.webhook";
import auth from "../../middlewares/auth";
import validateRequest from "../../middlewares/validateRequest";
import { UserRole } from "@prisma/client";
import {
  createPaymentIntentSchema,
  confirmPaymentSchema,
  refundPaymentSchema,
  paymentQuerySchema,
} from "./payment.validation";

const router = Router();

// ============================================================================
// WEBHOOK ROUTES (Must be before body parser middleware!)
// ============================================================================

// Stripe webhook endpoint - receives raw body
router.post("/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

// Test webhook endpoint
router.get("/webhook/test", testWebhook);

// ============================================================================
// AUTHENTICATED USER ROUTES
// ============================================================================

// Get my payments
router.get("/my-payments", auth(), validateRequest(paymentQuerySchema), PaymentController.getMyPayments);

// Create payment intent
router.post("/intent", auth(), validateRequest(createPaymentIntentSchema), PaymentController.createPaymentIntent);

// Confirm payment
router.post("/confirm", auth(), validateRequest(confirmPaymentSchema), PaymentController.confirmPayment);

// Get payment by ID
router.get("/:id", auth(), PaymentController.getPaymentById);

// ============================================================================
// ORGANIZER ROUTES
// ============================================================================

// Get event payments
router.get(
  "/event/:eventId",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(paymentQuerySchema),
  PaymentController.getEventPayments
);

// Process refund
router.post(
  "/:id/refund",
  auth(UserRole.ORGANIZER, UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(refundPaymentSchema),
  PaymentController.refundPayment
);

export default router;
