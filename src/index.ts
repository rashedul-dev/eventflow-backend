import express, { type Express, type Request, type Response } from "express"
import cors from "cors"
import helmet from "helmet"
import morgan from "morgan"
// import { config } from "./config/environment"
import { errorHandler, notFoundHandler } from "./middleware/error.middleware"
import { logger } from "./utils/logger"

// Import routes
import healthRoutes from "./routes/health.routes"
import { config } from "./config"
import { paymentRoutes } from "./app/modules/payment"

const app: Express = express()

// Security middleware
app.use(helmet())
app.use(
  cors({
    origin: config.corsOrigins,
    credentials: true,
  }),
)

// Body parsing middleware
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

app.use("/api/v1/payments", paymentRoutes);

// Logging middleware
app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => logger.http(message.trim()),
    },
  }),
)

// API Routes
app.use("/api/v1/health", healthRoutes)

// Root endpoint
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "EventFlow API",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString(),
  })
})

// Error handling
app.use(notFoundHandler)
app.use(errorHandler)

// Start server
const PORT = config.port

app.listen(PORT, () => {
  logger.info(`🚀 EventFlow API server running on port ${PORT}`)
  logger.info(`📍 Environment: ${config.nodeEnv}`)
  logger.info(`🔗 API Base URL: ${config.apiBaseUrl}`)
})

export default app
