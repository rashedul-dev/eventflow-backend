import type { Request, Response, NextFunction, RequestHandler } from "express"

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any>

/**
 * Wraps async route handlers to automatically catch errors
 * and pass them to the error handling middleware
 */
const catchAsync = (fn: AsyncRequestHandler): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

export default catchAsync
