// ============================================================================
// FILE: backend/src/app/modules/payment/payment.utils.ts
// ============================================================================

import Stripe from "stripe";
import { DEFAULT_PLATFORM_COMMISSION_PERCENT, STRIPE_PERCENTAGE_FEE, STRIPE_FIXED_FEE } from "./payment.constant";

/**
 * Calculate comprehensive payment breakdown
 */
export const calculatePaymentBreakdown = (
  subtotal: number,
  discount: number = 0,
  tax: number = 0,
  platformCommissionPercent: number = DEFAULT_PLATFORM_COMMISSION_PERCENT
): {
  subtotal: number;
  discount: number;
  taxAmount: number;
  serviceFee: number;
  stripeFee: number;
  platformCommission: number;
  organizerPayout: number;
  total: number;
} => {
  const afterDiscount = subtotal - discount;
  const taxAmount = tax;
  const subtotalWithTax = afterDiscount + taxAmount;

  // Service fee (can be passed to customer or absorbed)
  const serviceFee = 0; // Set to 0 to absorb fees, or calculate percentage

  const total = subtotalWithTax + serviceFee;

  // Stripe fee calculation: 2.9% + $0.30
  const stripeFee = total * (STRIPE_PERCENTAGE_FEE / 100) + STRIPE_FIXED_FEE;

  // Platform commission
  const platformCommission = subtotal * (platformCommissionPercent / 100);

  // Organizer receives: subtotal - discount - platform commission - stripe fees
  const organizerPayout = Math.max(0, subtotal - discount - platformCommission - stripeFee);

  return {
    subtotal: Number(subtotal.toFixed(2)),
    discount: Number(discount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    serviceFee: Number(serviceFee.toFixed(2)),
    stripeFee: Number(stripeFee.toFixed(2)),
    platformCommission: Number(platformCommission.toFixed(2)),
    organizerPayout: Number(organizerPayout.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
};

/**
 * Generate unique order number
 */
export const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${timestamp}-${random}`;
};

/**
 * Convert amount to Stripe format (cents)
 */
export const toStripeAmount = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Convert amount from Stripe format (cents to dollars)
 */
export const fromStripeAmount = (amount: number): number => {
  return Number((amount / 100).toFixed(2));
};

/**
 * Calculate refund amount with fee consideration
 */
export const calculateRefundAmount = (
  originalAmount: number,
  refundAmount?: number,
  shouldRefundFees: boolean = false
): {
  refundAmount: number;
  refundedPlatformCommission: number;
  refundedStripeFee: number;
} => {
  const actualRefundAmount = refundAmount || originalAmount;
  const refundPercentage = actualRefundAmount / originalAmount;
  console.log(refundPercentage);

  // Calculate proportional fee refunds if requested
  const refundedPlatformCommission = shouldRefundFees
    ? actualRefundAmount * (DEFAULT_PLATFORM_COMMISSION_PERCENT / 100)
    : 0;

  const refundedStripeFee = shouldRefundFees
    ? actualRefundAmount * (STRIPE_PERCENTAGE_FEE / 100) + STRIPE_FIXED_FEE
    : 0;

  return {
    refundAmount: Number(actualRefundAmount.toFixed(2)),
    refundedPlatformCommission: Number(refundedPlatformCommission.toFixed(2)),
    refundedStripeFee: Number(refundedStripeFee.toFixed(2)),
  };
};

/**
 * Validate Stripe webhook signature
 */
export const validateWebhookSignature = (
  payload: string | Buffer,
  signature: string,
  secret: string,
  stripe: Stripe
): Stripe.Event | null => {
  try {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return null;
  }
};

/**
 * Calculate payout schedule date
 */
export const calculatePayoutDate = (eventEndDate: Date, daysAfterEvent: number = 7): Date => {
  const payoutDate = new Date(eventEndDate);
  payoutDate.setDate(payoutDate.getDate() + daysAfterEvent);
  return payoutDate;
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number, currency: string = "USD"): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
  }).format(amount);
};
