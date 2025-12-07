// ============================================================================
// FILE: backend/src/app/modules/payment/payment.interface.ts
// ============================================================================

import type { PaymentStatus, PaymentMethod } from "@prisma/client";

export interface ICreatePaymentIntent {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  attendees?: Array<{
    name: string;
    email: string;
    phone?: string;
  }>;
  seatIds?: string[];
  promoCode?: string;
  billingEmail: string;
  billingName?: string;
  savePaymentMethod?: boolean;
}

export interface IPaymentCalculation {
  subtotal: number;
  discount: number;
  taxAmount: number;
  serviceFee: number;
  stripeFee: number;
  platformCommission: number;
  organizerPayout: number;
  total: number;
}

export interface IConfirmPayment {
  paymentIntentId: string;
  paymentMethodId?: string;
}

export interface IRefundPayment {
  paymentId: string;
  amount?: number; // Partial refund if specified
  reason: string;
}

export interface IPaymentFilterRequest {
  searchTerm?: string;
  status?: PaymentStatus;
  method?: PaymentMethod;
  userId?: string;
  eventId?: string;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface IWebhookEvent {
  type: string;
  data: {
    object: any;
  };
}

export interface IPayoutSchedule {
  eventId: string;
  organizerId: string;
  amount: number;
  currency: string;
  scheduledDate: Date;
  status: string;
}
