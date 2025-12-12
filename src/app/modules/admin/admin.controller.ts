// ============================================================================
// FILE: backend/src/app/modules/admin/admin.controller.ts
// ============================================================================

import type { Request, Response } from "express";
import httpStatus from "http-status";
import catchAsync from "../../shared/catchAsync";
import sendResponse from "../../shared/sendResponse";
import pick from "../../shared/pick";
import { AdminService } from "./admin.service";
import { adminFilterableFields } from "./admin.constant";
import { paginationFields } from "../../helpers/paginationHelper";
import { IAnalyticsQuery, ICommissionReport } from "./admin.interface";
import { cleanQuery, VALID_PERIODS, ValidPeriod } from "../../../utils/queryCleaner";

// ============================================================================
// EVENT VERIFICATION CONTROLLERS
// ============================================================================

const getPendingEvents = catchAsync(async (req: Request, res: Response) => {
  const paginationOptions = pick(req.query, paginationFields);
  const result = await AdminService.getPendingEvents(paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Pending events retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const verifyEvent = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.userId as string;
  const result = await AdminService.verifyEvent(id, adminId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Event ${req.body.status.toLowerCase()} successfully`,
    data: result,
  });
});

const getEventVerificationStats = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getEventVerificationStats();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Event verification statistics retrieved successfully",
    data: result,
  });
});

// ============================================================================
// USER MANAGEMENT CONTROLLERS
// ============================================================================

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, adminFilterableFields);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await AdminService.getAllUsers(filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users retrieved successfully",
    meta: result.meta,
    data: result.data,
  });
});

const manageUser = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  const adminId = req.user?.userId as string;
  const result = await AdminService.manageUser(id, adminId, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `User ${req.body.action} successful`,
    data: result,
  });
});

const getUserStatistics = catchAsync(async (_req: Request, res: Response) => {
  const result = await AdminService.getUserStatistics();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User statistics retrieved successfully",
    data: result,
  });
});

// ============================================================================
// ANALYTICS CONTROLLERS
// ============================================================================

const getPlatformAnalytics = catchAsync(async (req: Request, res: Response) => {
  const query = pick(req.query, ["period", "dateFrom", "dateTo"]);

  const cleanedQuery: IAnalyticsQuery = {
    period:
      typeof query.period === "string" && VALID_PERIODS.includes(query.period as ValidPeriod)
        ? (query.period as ValidPeriod)
        : undefined,
    dateFrom: typeof query.dateFrom === "string" ? query.dateFrom : undefined,
    dateTo: typeof query.dateTo === "string" ? query.dateTo : undefined,
  };

  const result = await AdminService.getPlatformAnalytics(cleanedQuery);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Platform analytics retrieved successfully",
    data: result,
  });
});

// ============================================================================
// COMMISSION REPORT CONTROLLERS
// ============================================================================

const getCommissionReport = catchAsync(async (req: Request, res: Response) => {
  const query = pick(req.query, ["dateFrom", "dateTo", "organizerId", "eventId"]);
  const cleaned: ICommissionReport = cleanQuery(query, ["dateFrom", "dateTo", "organizerId", "eventId"]);

  const result = await AdminService.getCommissionReport(cleaned);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Commission report generated successfully",
    data: result,
  });
});

export const AdminController = {
  // Event Verification
  getPendingEvents,
  verifyEvent,
  getEventVerificationStats,

  // User Management
  getAllUsers,
  manageUser,
  getUserStatistics,

  // Analytics
  getPlatformAnalytics,

  // Commission Reports
  getCommissionReport,
};
