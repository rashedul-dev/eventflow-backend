import type { Request, Response, NextFunction } from "express"
import type { AnyZodObject, ZodEffects } from "zod"

type ZodSchema = AnyZodObject | ZodEffects<AnyZodObject>

/**
 * Validates request data against a Zod schema
 * Can validate body, query, params, and cookies
 */
const validateRequest = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
        cookies: req.cookies,
      })
      next()
    } catch (error) {
      next(error)
    }
  }
}

export default validateRequest
