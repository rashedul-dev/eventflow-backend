// ============================================================================
// FILE: backend/src/app/modules/payment/payment.constant.ts
// ============================================================================

export const paymentStatuses = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
] as const

export const paymentMethods = ["CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "MOBILE_PAYMENT", "STRIPE"] as const

export const payoutStatuses = ["PENDING", "SCHEDULED", "IN_TRANSIT", "PAID", "FAILED", "CANCELLED"] as const

// Platform commission percentage (adjustable per transaction if needed)
export const DEFAULT_PLATFORM_COMMISSION_PERCENT = 5.0 // 5%

// Stripe fee calculation (2.9% + $0.30 per transaction)
export const STRIPE_PERCENTAGE_FEE = 2.9
export const STRIPE_FIXED_FEE = 0.3

// Payout schedule settings
export const PAYOUT_SCHEDULE = {
  // Days after event completion to process payout
  DAYS_AFTER_EVENT: 7,
  // Minimum payout amount
  MINIMUM_AMOUNT: 10.0,
  // Maximum days to hold before forced payout
  MAX_HOLD_DAYS: 30,
}

export const paymentSearchableFields = ["orderNumber", "stripePaymentIntentId", "billingEmail"]

export const paymentFilterableFields = [
  "searchTerm",
  "status",
  "method",
  "userId",
  "eventId",
  "dateFrom",
  "dateTo",
  "minAmount",
  "maxAmount",
]

export const paymentSelectFields = {
  id: true,
  orderNumber: true,
  status: true,
  method: true,
  subtotal: true,
  discount: true,
  taxAmount: true,
  serviceFee: true,
  totalAmount: true,
  currency: true,
  platformCommission: true,
  organizerPayout: true,
  stripePaymentIntentId: true,
  billingEmail: true,
  createdAt: true,
  updatedAt: true,
}