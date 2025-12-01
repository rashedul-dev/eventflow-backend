import type { Response } from "express"

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  errors?: unknown[]
  meta?: {
    page?: number
    limit?: number
    total?: number
    totalPages?: number
  }
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = "Success",
  statusCode = 200,
  meta?: ApiResponse["meta"],
): Response {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  }

  if (meta) {
    response.meta = meta
  }

  return res.status(statusCode).json(response)
}

export function sendError(res: Response, message: string, statusCode = 500, errors?: unknown[]): Response {
  const response: ApiResponse = {
    success: false,
    message,
  }

  if (errors) {
    response.errors = errors
  }

  return res.status(statusCode).json(response)
}

export function sendCreated<T>(res: Response, data: T, message = "Created successfully"): Response {
  return sendSuccess(res, data, message, 201)
}

export function sendNoContent(res: Response): Response {
  return res.status(204).send()
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  page: number,
  limit: number,
  total: number,
  message = "Success",
): Response {
  return sendSuccess(res, data, message, 200, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  })
}
