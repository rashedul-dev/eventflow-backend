// ============================================================================
// FILE: backend/src/app/modules/payment/payment.service.ts
// ============================================================================

import httpStatus from "http-status";
// import Stripe from "stripe";
import { PaymentStatus, type Prisma } from "@prisma/client";
import prisma from "../../../shared/prisma";
import { getStripeClient } from "../../../shared/stripe";
import ApiError from "../../errors/ApiError";
import { calculatePagination, createPaginatedResponse, type IPaginationOptions } from "../../helpers/paginationHelper";
import { paymentSearchableFields, paymentSelectFields, DEFAULT_PLATFORM_COMMISSION_PERCENT } from "./payment.constant";
import type { ICreatePaymentIntent, IConfirmPayment, IRefundPayment, IPaymentFilterRequest } from "./payment.interface";
import {
  calculatePaymentBreakdown,
  generateOrderNumber,
  toStripeAmount,
//   fromStripeAmount,
  calculateRefundAmount,
} from "./payment.utils";
import { logger } from "../../../utils/logger";

// Get Stripe instance
const stripe = getStripeClient();

if (!stripe) {
  throw new Error("Stripe is not configured. Please set STRIPE_SECRET_KEY in environment variables.");
}

/**
 * Create Payment Intent for ticket purchase
 */
const createPaymentIntent = async (userId: string, payload: ICreatePaymentIntent) => {
  const { eventId, ticketTypeId, quantity, promoCode, billingEmail, billingName } = payload;

  // Validate event and ticket type
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      organizer: {
        select: { id: true, email: true, stripeCustomerId: true },
      },
    },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
  });

  if (!ticketType || ticketType.eventId !== eventId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Ticket type not found");
  }

  // Check availability
  const availableQuantity = ticketType.quantity - ticketType.quantitySold;
  if (quantity > availableQuantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, `Only ${availableQuantity} tickets available`);
  }

  // Calculate subtotal
  const subtotal = Number(ticketType.price) * quantity;

  // Apply promo code if provided
  let discount = 0;
  if (promoCode) {
    const promo = await prisma.promoCode.findUnique({
      where: { code: promoCode },
    });

    if (promo && promo.isActive) {
      const now = new Date();
      if (now >= promo.validFrom && now <= promo.validUntil) {
        if (!promo.maxUses || promo.usedCount < promo.maxUses) {
          if (promo.discountType === "PERCENTAGE") {
            discount = (subtotal * Number(promo.discountValue)) / 100;
            if (promo.maxDiscount && discount > Number(promo.maxDiscount)) {
              discount = Number(promo.maxDiscount);
            }
          } else {
            discount = Number(promo.discountValue);
          }
        }
      }
    }
  }

  // Calculate payment breakdown
  const breakdown = calculatePaymentBreakdown(subtotal, discount, 0, DEFAULT_PLATFORM_COMMISSION_PERCENT);

  // Create payment record in database
  const orderNumber = generateOrderNumber();

  const payment = await prisma.payment.create({
    data: {
      userId,
      orderNumber,
      status: PaymentStatus.PENDING,
      method: "STRIPE",
      subtotal: breakdown.subtotal,
      discount: breakdown.discount,
      taxAmount: breakdown.taxAmount,
      serviceFee: breakdown.serviceFee,
      totalAmount: breakdown.total,
      currency: ticketType.currency,
      platformCommission: breakdown.platformCommission,
      platformCommissionPct: DEFAULT_PLATFORM_COMMISSION_PERCENT,
      organizerPayout: breakdown.organizerPayout,
      promoCode,
      promoDiscount: discount,
      billingEmail,
      billingName,
    },
  });

  // Create Stripe Payment Intent
  const paymentIntent = await stripe.paymentIntents.create({
    amount: toStripeAmount(breakdown.total),
    currency: ticketType.currency.toLowerCase(),
    metadata: {
      paymentId: payment.id,
      orderNumber,
      eventId,
      ticketTypeId,
      quantity: quantity.toString(),
      userId,
    },
    description: `${event.title} - ${quantity} x ${ticketType.name}`,
    receipt_email: billingEmail,
  });

  // Update payment with Stripe Payment Intent ID
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      stripePaymentIntentId: paymentIntent.id,
      status: PaymentStatus.PROCESSING,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  logger.info(`Payment intent created: ${paymentIntent.id} for order ${orderNumber}`);

  return {
    payment: updatedPayment,
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    breakdown,
  };
};

/**
 * Confirm payment and create tickets
 */
const confirmPayment = async (userId: string, payload: IConfirmPayment) => {
  const { paymentIntentId } = payload;

  // Find payment by Stripe Payment Intent ID
  const payment = await prisma.payment.findFirst({
    where: {
      stripePaymentIntentId: paymentIntentId,
      userId,
    },
  });

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Payment not found");
  }

  if (payment.status === PaymentStatus.COMPLETED) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Payment already completed");
  }

  // Retrieve Payment Intent from Stripe
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (paymentIntent.status !== "succeeded") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Payment has not succeeded yet");
  }

  // Update payment status
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.COMPLETED,
      completedAt: new Date(),
    //   stripeChargeId: paymentIntent.charges.data[0]?.id,
      stripeChargeId: paymentIntent.latest_charge as string,
    },
  });

  logger.info(`Payment confirmed: ${payment.orderNumber}`);

  return updatedPayment;
};

/**
 * Process refund
 */
const refundPayment = async (paymentId: string, organizerId: string, payload: IRefundPayment) => {
  const { amount, reason } = payload;

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      tickets: {
        include: {
          event: true,
        },
      },
    },
  });

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Payment not found");
  }

  // Verify organizer owns the event
  const event = payment.tickets[0]?.event;
  if (!event || event.organizerId !== organizerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to refund this payment");
  }

  if (payment.status !== PaymentStatus.COMPLETED) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Can only refund completed payments");
  }

  if (!payment.stripeChargeId) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No Stripe charge found for this payment");
  }

  // Calculate refund amount
  const refundCalculation = calculateRefundAmount(Number(payment.totalAmount), amount);
  const refundAmount = refundCalculation.refundAmount;

  // Process refund through Stripe
  const refund = await stripe.refunds.create({
    charge: payment.stripeChargeId,
    amount: toStripeAmount(refundAmount),
    reason: "requested_by_customer",
    metadata: {
      paymentId: payment.id,
      orderNumber: payment.orderNumber,
      reason,
    },
  });

  // Update payment record
  const isPartialRefund = refundAmount < Number(payment.totalAmount);
  const updatedPayment = await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: isPartialRefund ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED,
      refundAmount: refundAmount,
      refundReason: reason,
      refundedAt: new Date(),
      stripeRefundId: refund.id,
    },
  });

  logger.info(`Payment refunded: ${payment.orderNumber} - Amount: ${refundAmount}`);

  return {
    payment: updatedPayment,
    refund,
    refundAmount,
  };
};

/**
 * Get payment by ID
 */
const getPaymentById = async (paymentId: string, userId: string, userRole: string) => {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
        },
      },
      tickets: {
        include: {
          ticketType: {
            select: {
              id: true,
              name: true,
              category: true,
            },
          },
          event: {
            select: {
              id: true,
              title: true,
              slug: true,
              startDate: true,
              organizerId: true,
            },
          },
        },
      },
    },
  });

  if (!payment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Payment not found");
  }

  // Check authorization
  const isOwner = payment.userId === userId;
  const isOrganizer = payment.tickets.some((t) => t.event.organizerId === userId);
  const isAdmin = userRole === "ADMIN" || userRole === "SUPER_ADMIN";

  if (!isOwner && !isOrganizer && !isAdmin) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to view this payment");
  }

  return payment;
};

/**
 * Get user's payments with pagination
 */
const getUserPayments = async (
  userId: string,
  paginationOptions: IPaginationOptions,
  filters?: IPaymentFilterRequest
) => {
  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);

  const whereInput: Prisma.PaymentWhereInput = {
    userId,
    ...(filters?.status && { status: filters.status }),
    ...(filters?.dateFrom && { createdAt: { gte: new Date(filters.dateFrom) } }),
    ...(filters?.dateTo && { createdAt: { lte: new Date(filters.dateTo) } }),
  };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        ...paymentSelectFields,
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            event: {
              select: {
                id: true,
                title: true,
                startDate: true,
              },
            },
          },
        },
      },
    }),
    prisma.payment.count({ where: whereInput }),
  ]);

  return createPaginatedResponse(payments, total, { page, limit, skip, sortBy, sortOrder });
};

/**
 * Get event payments (for organizer)
 */
const getEventPayments = async (
  eventId: string,
  organizerId: string,
  paginationOptions: IPaginationOptions,
  filters?: IPaymentFilterRequest
) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, "Event not found");
  }

  if (event.organizerId !== organizerId) {
    throw new ApiError(httpStatus.FORBIDDEN, "Not authorized to view payments for this event");
  }

  const { page, limit, skip, sortBy, sortOrder } = calculatePagination(paginationOptions);
  const { searchTerm, ...filterData } = filters || {};

  const whereConditions: Prisma.PaymentWhereInput[] = [
    {
      tickets: {
        some: { eventId },
      },
    },
  ];

  if (searchTerm) {
    whereConditions.push({
      OR: paymentSearchableFields.map((field) => ({
        [field]: {
          contains: searchTerm,
          mode: "insensitive" as Prisma.QueryMode,
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    whereConditions.push(filterData as Prisma.PaymentWhereInput);
  }

  const whereInput: Prisma.PaymentWhereInput = { AND: whereConditions };

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        tickets: {
          select: {
            id: true,
            ticketNumber: true,
            ticketType: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.payment.count({ where: whereInput }),
  ]);

  return createPaginatedResponse(payments, total, { page, limit, skip, sortBy, sortOrder });
};

export const PaymentService = {
  createPaymentIntent,
  confirmPayment,
  refundPayment,
  getPaymentById,
  getUserPayments,
  getEventPayments,
};