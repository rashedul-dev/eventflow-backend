import httpStatus from "http-status"

class ApiError extends Error {
  statusCode: number
  isOperational: boolean
  stack?: string

  constructor(statusCode: number, message: string, isOperational = true, stack = "") {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational

    if (stack) {
      this.stack = stack
    } else {
      Error.captureStackTrace(this, this.constructor)
    }
  }
}

// Pre-built error factories for common cases
export const createBadRequestError = (message = "Bad Request") => new ApiError(httpStatus.BAD_REQUEST, message)

export const createUnauthorizedError = (message = "Unauthorized") => new ApiError(httpStatus.UNAUTHORIZED, message)

export const createForbiddenError = (message = "Forbidden") => new ApiError(httpStatus.FORBIDDEN, message)

export const createNotFoundError = (message = "Not Found") => new ApiError(httpStatus.NOT_FOUND, message)

export const createConflictError = (message = "Conflict") => new ApiError(httpStatus.CONFLICT, message)

export const createValidationError = (message = "Validation Error") =>
  new ApiError(httpStatus.UNPROCESSABLE_ENTITY, message)

export const createInternalError = (message = "Internal Server Error") =>
  new ApiError(httpStatus.INTERNAL_SERVER_ERROR, message, false)

export default ApiError
