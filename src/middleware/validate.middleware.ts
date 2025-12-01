import type { Request, Response, NextFunction } from "express"
import { type ZodSchema, ZodError } from "zod"
import { sendError } from "../utils/api-response"

interface ValidationSchemas {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

export const validate = (schemas: ValidationSchemas) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body)
      }
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as any
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params)
      }
      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }))
        return sendError(res, "Validation failed", 422, errors)
      }
      next(error)
    }
  }
}

export const validateBody = (schema: ZodSchema) => validate({ body: schema })
export const validateQuery = (schema: ZodSchema) => validate({ query: schema })
export const validateParams = (schema: ZodSchema) => validate({ params: schema })
