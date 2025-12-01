import type { Request, Response } from "express"
import httpStatus from "http-status"

const notFound = (req: Request, res: Response): void => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    errorMessages: [
      {
        path: req.originalUrl,
        message: "Route not found",
      },
    ],
  })
}

export default notFound
