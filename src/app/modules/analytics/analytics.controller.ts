// ============================================================================
// FILE: backend/src/app/modules/analytics/analytics.controller.ts
// ============================================================================

import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import pick from "../../shared/pick";
import { AnalyticsService } from "./analytics.service";

// GET /analytics/admin/overview
const getAdminOverview = catchAsync(async (req: Request, res: Response) => {
  const query = pick(req.query, ["period", "dateFrom", "dateTo"]);
  
  const result = await AnalyticsService.getAdminAnalytics({
    period: query.period as any,
    dateFrom: query.dateFrom as string,
    dateTo: query.dateTo as string,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin analytics retrieved successfully",
    data: result,
  });
});

// GET /analytics/organizer/overview
const getOrganizerOverview = catchAsync(async (req: Request, res: Response) => {
  const organizerId = req.user!.userId as string;
  const query = pick(req.query, ["period", "dateFrom", "dateTo", "eventId"]);

  const result = await AnalyticsService.getOrganizerAnalytics(organizerId, {
    period: query.period as any,
    dateFrom: query.dateFrom as string,
    dateTo: query.dateTo as string,
    eventId: query.eventId as string,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Organizer analytics retrieved successfully",
    data: result,
  });
});

// GET /analytics/organizer/events/:eventId
const getEventAnalytics = catchAsync(async (req: Request, res: Response) => {
  const { eventId } = req.params;
  const organizerId = req.user!.userId as string;
  
  const result = await AnalyticsService.getEventAnalytics(eventId, organizerId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event analytics retrieved successfully",
    data: result,
  });
});

// GET /analytics/commission-reports
const getCommissionReports = catchAsync(async (req: Request, res: Response) => {
  const query = pick(req.query, ["organizerId", "month", "status", "dateFrom", "dateTo"]);
  
  const result = await AnalyticsService.getCommissionReports({
    organizerId: query.organizerId as string,
    month: query.month as string,
    status: query.status as string,
    dateFrom: query.dateFrom as string,
    dateTo: query.dateTo as string,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Commission reports retrieved successfully",
    data: result,
  });
});

export const AnalyticsController = {
  getAdminOverview,
  getOrganizerOverview,
  getEventAnalytics,
  getCommissionReports,
};