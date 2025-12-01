import { PrismaClient } from "@prisma/client"
import { logger } from "../utils/logger"
import { config } from "../config"

// Declare global prisma instance for hot reloading in development
declare global {
  var __prisma: PrismaClient | undefined
}

// Create Prisma client with logging configuration
const createPrismaClient = () => {
  return new PrismaClient({
    log: config.isDevelopment
      ? [
          { emit: "event", level: "query" },
          { emit: "event", level: "error" },
          { emit: "event", level: "warn" },
        ]
      : [{ emit: "event", level: "error" }],
  })
}

// Use global instance in development to prevent multiple connections during hot reload
export const prisma = globalThis.__prisma || createPrismaClient()

if (config.isDevelopment) {
  globalThis.__prisma = prisma
}

// Set up event listeners for logging
prisma.$on("query" as never, (e: { query: string; duration: number }) => {
  if (config.isDevelopment) {
    logger.debug(`Prisma Query: ${e.query}`)
    logger.debug(`Duration: ${e.duration}ms`)
  }
})

prisma.$on("error" as never, (e: { message: string }) => {
  logger.error(`Prisma Error: ${e.message}`)
})

// Database connection functions
export const connectDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect()
    logger.info("Database connected successfully")
  } catch (error) {
    logger.error("Database connection failed:", error)
    throw error
  }
}

export const disconnectDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect()
    logger.info("Database disconnected")
  } catch (error) {
    logger.error("Error disconnecting database:", error)
    throw error
  }
}

// Health check for database
export const checkDatabaseHealth = async (): Promise<{
  connected: boolean
  latency?: number
  error?: string
}> => {
  const start = Date.now()
  try {
    await prisma.$queryRaw`SELECT 1`
    return {
      connected: true,
      latency: Date.now() - start,
    }
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

export default prisma
