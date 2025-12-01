export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly errors?: any[]

  constructor(message: string, statusCode = 500, isOperational = true, errors?: any[]) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = isOperational
    this.errors = errors

    Error.captureStackTrace(this, this.constructor)
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", errors?: any[]) {
    super(message, 400, true, errors)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401, true)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403, true)
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not Found") {
    super(message, 404, true)
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409, true)
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation Error", errors?: any[]) {
    super(message, 422, true, errors)
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal Server Error") {
    super(message, 500, false)
  }
}
