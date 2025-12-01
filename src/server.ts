import { app } from "./app"
import { config } from "./config"
import { logger } from "./utils/logger"
import { connectDatabase, disconnectDatabase } from "./shared/prisma"

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`)

  // Close database connection
  await disconnectDatabase()

  logger.info("Graceful shutdown completed")
  process.exit(0)
}

// Handle uncaught exceptions
process.on("uncaughtException", (error: Error) => {
  logger.error("Uncaught Exception:", error)
  process.exit(1)
})

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason: unknown) => {
  logger.error("Unhandled Rejection:", reason)
  process.exit(1)
})

// Handle termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase()

    // Start Express server
    const server = app.listen(config.port, () => {
      logger.info(`EventFlow API server running on port ${config.port}`)
      logger.info(`Environment: ${config.nodeEnv}`)
      logger.info(`API Base URL: ${config.apiBaseUrl}`)

      if (config.isDevelopment) {
        logger.info(`Health check: ${config.apiBaseUrl}/api/v1/health`)
      }
    })

    // Handle server errors
    server.on("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE") {
        logger.error(`Port ${config.port} is already in use`)
      } else {
        logger.error("Server error:", error)
      }
      process.exit(1)
    })
  } catch (error) {
    logger.error("Failed to start server:", error)
    process.exit(1)
  }
}

// Run server
startServer()
