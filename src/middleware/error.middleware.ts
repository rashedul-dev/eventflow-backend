import type { Request, Response, NextFunction } from "express"
import { AppError } from "../utils/app-error"
import { sendError } from "../utils/api-response"
import { logger } from "../utils/logger"

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): Response {
  // Log the error
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  })

  // Handle known operational errors
  if (err instanceof AppError) {
    return sendError(res, err.message, err.statusCode, err.errors)
  }

  // Handle Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    const prismaError = err as any

    switch (prismaError.code) {
      case "P2002":
        return sendError(res, "A record with this value already exists", 409)
      case "P2025":
        return sendError(res, "Record not found", 404)
      default:
        return sendError(res, "Database error", 500)
    }
  }

  // Handle validation errors
  if (err.name === "ValidationError") {
    return sendError(res, "Validation failed", 422)
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError") {
    return sendError(res, "Invalid token", 401)
  }

  if (err.name === "TokenExpiredError") {
    return sendError(res, "Token expired", 401)
  }

  // Default to 500 server error
  const message = process.env.NODE_ENV === "production" ? "Internal server error" : err.message

  return sendError(res, message, 500)
}

export function notFoundHandler(req: Request, res: Response, _next: NextFunction): Response {
  return sendError(res, `Route ${req.method} ${req.path} not found`, 404)
}
