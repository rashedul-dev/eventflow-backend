// ============================================================================
// FILE: backend/src/app/modules/payment/payment.webhook.ts
// ============================================================================

import type { Request, Response } from "express";
import Stripe from "stripe";
import { PaymentStatus, TicketStatus } from "@prisma/client";
import prisma from "../../../shared/prisma";
import { getStripeClient } from "../../../shared/stripe";
import { config } from "../../../config";
import { logger } from "../../../utils/logger";
import { fromStripeAmount } from "./payment.utils";
import { generateTicketNumber, generateQRCodeId, generateBarcode } from "../ticket/ticket.utils";

const stripe = getStripeClient();

if (!stripe) {
  throw new Error("Stripe is not configured");
}

/**
 * Main webhook handler
 */
export const handleStripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  if (!config.stripe.webhookSecret) {
    logger.error("Stripe webhook secret not configured");
    res.status(500).json({ error: "Webhook secret not configured" });
    return;
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, signature, config.stripe.webhookSecret);
  } catch (error) {
    logger.error("Webhook signature verification failed:", error);
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  logger.info(`Received Stripe webhook: ${event.type}`);

  try {
    // Handle different event types
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case "charge.dispute.created":
        await handleDisputeCreated(event.data.object as Stripe.Dispute);
        break;

      case "payout.paid":
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      case "payout.failed":
        await handlePayoutFailed(event.data.object as Stripe.Payout);
        break;

      default:
        logger.info(`Unhandled webhook event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    logger.error(`Error processing webhook ${event.type}:`, error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

/**
 * Handle successful payment
 */
const handlePaymentIntentSucceeded = async (paymentIntent: Stripe.PaymentIntent): Promise<void> => {
  const paymentId = paymentIntent.metadata.paymentId;

  if (!paymentId) {
    logger.error("Payment ID not found in metadata");
    return;
  }

  // Find payment record
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      tickets: true,
    },
  });

  if (!payment) {
    logger.error(`Payment not found: ${paymentId}`);
    return;
  }

  // If tickets already created, skip
  if (payment.tickets.length > 0) {
    logger.info(`Tickets already created for payment: ${paymentId}`);
    return;
  }

  // Extract metadata
  const { eventId, ticketTypeId, quantity, userId } = paymentIntent.metadata;

  try {
    // Create tickets in transaction
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.COMPLETED,
          completedAt: new Date(),
          //   stripeChargeId: paymentIntent.charges.data[0]?.id,
          stripeChargeId: paymentIntent.latest_charge as string,
        },
      });

      // Create tickets
      const ticketsToCreate = [];
      for (let i = 0; i < parseInt(quantity); i++) {
        ticketsToCreate.push({
          ticketNumber: generateTicketNumber(),
          ticketTypeId,
          eventId,
          userId,
          paymentId,
          qrCode: generateQRCodeId(),
          barcode: generateBarcode(),
          pricePaid: fromStripeAmount(paymentIntent.amount) / parseInt(quantity),
          currency: paymentIntent.currency.toUpperCase(),
          status: TicketStatus.ACTIVE,
        });
      }

      await tx.ticket.createMany({ data: ticketsToCreate });

      // Update ticket type sold count
      await tx.ticketType.update({
        where: { id: ticketTypeId },
        data: { quantitySold: { increment: parseInt(quantity) } },
      });
    });

    logger.info(`Tickets created for payment: ${paymentId}`);
  } catch (error) {
    logger.error(`Error creating tickets for payment ${paymentId}:`, error);
    throw error;
  }
};

/**
 * Handle failed payment
 */
const handlePaymentIntentFailed = async (paymentIntent: Stripe.PaymentIntent): Promise<void> => {
  const paymentId = paymentIntent.metadata.paymentId;

  if (!paymentId) {
    logger.error("Payment ID not found in metadata");
    return;
  }

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: PaymentStatus.FAILED,
    },
  });

  logger.info(`Payment failed: ${paymentId}`);
};

/**
 * Handle charge refund
 */
const handleChargeRefunded = async (charge: Stripe.Charge): Promise<void> => {
  const payment = await prisma.payment.findFirst({
    where: { stripeChargeId: charge.id },
  });

  if (!payment) {
    logger.error(`Payment not found for charge: ${charge.id}`);
    return;
  }

  const refundAmount = fromStripeAmount(charge.amount_refunded);
  const isFullRefund = charge.amount_refunded === charge.amount;

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: isFullRefund ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
      refundAmount,
      refundedAt: new Date(),
    },
  });

  logger.info(`Charge refunded: ${charge.id} - Amount: ${refundAmount}`);
};

/**
 * Handle dispute created
 */
const handleDisputeCreated = async (dispute: Stripe.Dispute): Promise<void> => {
  const chargeId = typeof dispute.charge === "string" ? dispute.charge : dispute.charge?.id;

  if (!chargeId) {
    logger.error("Charge ID not found in dispute");
    return;
  }

  const payment = await prisma.payment.findFirst({
    where: { stripeChargeId: chargeId },
  });

  if (!payment) {
    logger.error(`Payment not found for disputed charge: ${chargeId}`);
    return;
  }

  // You might want to create a disputes table to track these
  logger.warn(`Dispute created for payment: ${payment.id}`);

  // Optionally notify organizer
  // await sendDisputeNotification(payment)
};

/**
 * Handle successful payout
 */
const handlePayoutPaid = async (payout: Stripe.Payout): Promise<void> => {
  logger.info(`Payout paid: ${payout.id} - Amount: ${fromStripeAmount(payout.amount)}`);

  // Update payout records if you're tracking them
  // await prisma.payout.updateMany({
  //   where: { stripePayoutId: payout.id },
  //   data: { status: "PAID", paidAt: new Date() }
  // })
};

/**
 * Handle failed payout
 */
const handlePayoutFailed = async (payout: Stripe.Payout): Promise<void> => {
  logger.error(`Payout failed: ${payout.id} - Reason: ${payout.failure_message}`);

  // Update payout records
  // await prisma.payout.updateMany({
  //   where: { stripePayoutId: payout.id },
  //   data: { status: "FAILED", failureReason: payout.failure_message }
  // })
};

/**
 * Test webhook (for development)
 */
export const testWebhook = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: "Webhook endpoint is working",
    timestamp: new Date().toISOString(),
  });
};
