import type { ErrorRequestHandler } from "express"
import { Prisma } from "@prisma/client"
import { ZodError } from "zod"
import httpStatus from "http-status"
import ApiError from "../errors/ApiError"
import { config } from "../../config"
import { logger } from "../../utils/logger"

// Error response interface
interface IGenericErrorMessage {
  path: string | number
  message: string
}

interface IGenericErrorResponse {
  statusCode: number
  message: string
  errorMessages: IGenericErrorMessage[]
}

// Handle Zod validation errors
const handleZodError = (error: ZodError): IGenericErrorResponse => {
  const errors: IGenericErrorMessage[] = error.issues.map((issue) => ({
    path: issue.path[issue.path.length - 1] || "",
    message: issue.message,
  }))

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: "Validation Error",
    errorMessages: errors,
  }
}

// Handle Prisma validation errors
const handlePrismaValidationError = (error: Prisma.PrismaClientValidationError): IGenericErrorResponse => {
  const message = error.message.split("\n").pop() || "Validation Error"

  return {
    statusCode: httpStatus.BAD_REQUEST,
    message: "Validation Error",
    errorMessages: [{ path: "", message }],
  }
}

// Handle Prisma known request errors
const handlePrismaClientError = (error: Prisma.PrismaClientKnownRequestError): IGenericErrorResponse => {
  let message = "Database Error"
  let statusCode = httpStatus.BAD_REQUEST

  switch (error.code) {
    case "P2002":
      const target = (error.meta?.target as string[]) || []
      message = `${target.join(", ")} already exists`
      statusCode = httpStatus.CONFLICT
      break
    case "P2025":
      message = "Record not found"
      statusCode = httpStatus.NOT_FOUND
      break
    case "P2003":
      message = "Foreign key constraint failed"
      break
    case "P2014":
      message = "Invalid relation"
      break
    default:
      message = error.message
  }

  return {
    statusCode,
    message,
    errorMessages: [{ path: "", message }],
  }
}

const globalErrorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  // Log the error
  logger.error(`[${req.method}] ${req.path} >> ${error.message}`, {
    stack: config.isDevelopment ? error.stack : undefined,
    body: req.body,
    params: req.params,
    query: req.query,
  })

  let statusCode = httpStatus.INTERNAL_SERVER_ERROR
  let message = "Something went wrong!"
  let errorMessages: IGenericErrorMessage[] = []

  // Handle different error types
  if (error instanceof ApiError) {
    statusCode = error.statusCode
    message = error.message
    errorMessages = error.message ? [{ path: "", message: error.message }] : []
  } else if (error instanceof ZodError) {
    const zodError = handleZodError(error)
    statusCode = zodError.statusCode
    message = zodError.message
    errorMessages = zodError.errorMessages
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    const prismaError = handlePrismaValidationError(error)
    statusCode = prismaError.statusCode
    message = prismaError.message
    errorMessages = prismaError.errorMessages
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const prismaError = handlePrismaClientError(error)
    statusCode = prismaError.statusCode
    message = prismaError.message
    errorMessages = prismaError.errorMessages
  } else if (error.name === "JsonWebTokenError") {
    statusCode = httpStatus.UNAUTHORIZED
    message = "Invalid token"
    errorMessages = [{ path: "", message: "Invalid token" }]
  } else if (error.name === "TokenExpiredError") {
    statusCode = httpStatus.UNAUTHORIZED
    message = "Token expired"
    errorMessages = [{ path: "", message: "Token has expired" }]
  } else if (error instanceof Error) {
    message = error.message
    errorMessages = error.message ? [{ path: "", message: error.message }] : []
  }

  res.status(statusCode).json({
    success: false,
    message,
    errorMessages,
    stack: config.isDevelopment ? error.stack : undefined,
  })
}

export default globalErrorHandler
