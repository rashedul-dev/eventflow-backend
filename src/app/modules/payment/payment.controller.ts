// ============================================================================
// FILE: backend/src/app/modules/payment/payment.controller.ts
// ============================================================================

import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import pick from "../../shared/pick";
import { PaymentService } from "./payment.service";
import { paymentFilterableFields } from "./payment.constant";
import { paginationFields } from "../../helpers/paginationHelper";

// Create payment intent
const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await PaymentService.createPaymentIntent(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Payment intent created successfully",
    data: result,
  });
});

// Confirm payment
const confirmPayment = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const result = await PaymentService.confirmPayment(userId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment confirmed successfully",
    data: result,
  });
});

// Process refund
const refundPayment = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const organizerId = req.user?.userId as string;
  const result = await PaymentService.refundPayment(id, organizerId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Refund processed successfully",
    data: result,
  });
});

// Get payment by ID
const getPaymentById = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user?.userId as string;
  const userRole = req.user?.role as string;
  const result = await PaymentService.getPaymentById(id, userId, userRole);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment retrieved successfully",
    data: result,
  });
});

// Get my payments
const getMyPayments = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.userId as string;
  const paginationOptions = pick(req.query, paginationFields);
  const filters = pick(req.query, paymentFilterableFields);
  const result = await PaymentService.getUserPayments(userId, paginationOptions, filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

// Get event payments (organizer)
const getEventPayments = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const organizerId = req.user?.userId as string;
  const paginationOptions = pick(req.query, paginationFields);
  const filters = pick(req.query, paymentFilterableFields);
  const result = await PaymentService.getEventPayments(eventId, organizerId, paginationOptions, filters);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event payments retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

export const PaymentController = {
  createPaymentIntent,
  confirmPayment,
  refundPayment,
  getPaymentById,
  getMyPayments,
  getEventPayments,
};