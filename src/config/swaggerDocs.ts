// ============================================================================
// FILE: backend/src/config/swaggerDocs.ts
// Complete Centralized Swagger/OpenAPI Documentation
// ============================================================================

import swaggerJsdoc from "swagger-jsdoc";
import { config } from "./index";

export const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "EventFlow API",
      version: "1.0.0",
      description:
        "Comprehensive Event Management Platform API - Complete documentation for all endpoints including authentication, user management, event operations, ticketing, payments, notifications, analytics, and admin features.",
      contact: {
        name: "EventFlow Support",
        email: "rashedulislam.edge@gmail.com",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: config.apiBaseUrl,
        description: config.isDevelopment ? "Development server" : "Production server",
      },
      //   {
      //     url: "https://api.eventflow.com/api/v1",
      //     description: "Production server",
      //   },
    ],
    tags: [
      { name: "Health", description: "Health check and system monitoring endpoints" },
      { name: "Authentication", description: "User authentication and session management" },
      { name: "Users", description: "User profile and organizer management" },
      { name: "Events", description: "Event creation, management, and discovery" },
      { name: "Events - Advanced", description: "Advanced event features (seating, waitlist, cloning)" },
      { name: "Tickets", description: "Ticket purchasing, transfer, and validation" },
      { name: "Payments", description: "Payment processing, refunds, and webhooks" },
      { name: "Admin", description: "Administrative operations and platform management" },
      { name: "Notifications", description: "User notifications and preferences" },
      { name: "Analytics", description: "Analytics, reports, and data export" },
    ],

    // ============================================================================
    // SECURITY SCHEMES
    // ============================================================================

    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Enter your JWT token in the format: Bearer {token}",
        },
      },

      // ============================================================================
      // REUSABLE SCHEMAS
      // ============================================================================

      schemas: {
        // ========== ERROR RESPONSES ==========
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "An error occurred" },
            errorMessages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path: { type: "string", example: "email" },
                  message: { type: "string", example: "Invalid email format" },
                },
              },
            },
            stack: { type: "string", description: "Stack trace (development only)" },
          },
        },

        ValidationError: {
          type: "object",
          properties: {
            success: { type: "boolean", example: false },
            message: { type: "string", example: "Validation failed" },
            errorMessages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  path: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },

        // ========== USER SCHEMAS ==========
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "clxy1234567890abcdef" },
            email: { type: "string", format: "email", example: "user@example.com" },
            firstName: { type: "string", example: "John", nullable: true },
            lastName: { type: "string", example: "Doe", nullable: true },
            phone: { type: "string", example: "+1234567890", nullable: true },
            avatar: { type: "string", example: "https://example.com/avatar.jpg", nullable: true },
            role: {
              type: "string",
              enum: ["SUPER_ADMIN", "ADMIN", "ORGANIZER", "ATTENDEE"],
              example: "ATTENDEE",
            },
            isActive: { type: "boolean", example: true },
            isEmailVerified: { type: "boolean", example: false },
            isPhoneVerified: { type: "boolean", example: false },
            lastLoginAt: { type: "string", format: "date-time", nullable: true },
            organizationName: { type: "string", nullable: true },
            organizationDesc: { type: "string", nullable: true },
            website: { type: "string", nullable: true },
            socialLinks: {
              type: "object",
              nullable: true,
              example: {
                facebook: "https://facebook.com/example",
                twitter: "https://twitter.com/example",
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        OrganizerProfile: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            firstName: { type: "string" },
            lastName: { type: "string" },
            organizationName: { type: "string", nullable: true },
            organizationDesc: { type: "string", nullable: true },
            website: { type: "string", nullable: true },
            socialLinks: { type: "object", nullable: true },
            role: { type: "string", enum: ["ORGANIZER", "ADMIN", "SUPER_ADMIN"] },
            eventsCount: { type: "integer", example: 5 },
          },
        },

        // ========== AUTH SCHEMAS ==========
        AuthTokens: {
          type: "object",
          properties: {
            accessToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
            refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
          },
        },

        AuthResponse: {
          type: "object",
          properties: {
            success: { type: "boolean", example: true },
            message: { type: "string", example: "Login successful" },
            data: {
              type: "object",
              properties: {
                user: { $ref: "#/components/schemas/User" },
                tokens: { $ref: "#/components/schemas/AuthTokens" },
              },
            },
          },
        },

        // ========== EVENT SCHEMAS ==========
        Event: {
          type: "object",
          properties: {
            id: { type: "string", example: "clxy1234567890abcdef" },
            title: { type: "string", example: "Tech Conference 2024" },
            slug: { type: "string", example: "tech-conference-2024" },
            description: { type: "string", example: "Annual technology conference featuring industry leaders" },
            shortDescription: { type: "string", example: "Join us for an amazing tech event", nullable: true },
            startDate: { type: "string", format: "date-time", example: "2024-12-15T09:00:00Z" },
            endDate: { type: "string", format: "date-time", example: "2024-12-15T18:00:00Z" },
            timezone: { type: "string", example: "UTC", default: "UTC" },
            isVirtual: { type: "boolean", example: false },
            venueName: { type: "string", example: "Convention Center", nullable: true },
            venueAddress: { type: "string", example: "123 Main St", nullable: true },
            city: { type: "string", example: "New York", nullable: true },
            state: { type: "string", example: "NY", nullable: true },
            country: { type: "string", example: "USA", nullable: true },
            postalCode: { type: "string", example: "10001", nullable: true },
            latitude: { type: "number", format: "float", nullable: true },
            longitude: { type: "number", format: "float", nullable: true },
            virtualLink: { type: "string", example: "https://zoom.us/j/123456789", nullable: true },
            virtualPlatform: { type: "string", example: "Zoom", nullable: true },
            coverImage: { type: "string", nullable: true },
            thumbnailImage: { type: "string", nullable: true },
            images: { type: "array", items: { type: "string" }, nullable: true },
            capacity: { type: "integer", example: 500, nullable: true },
            isPrivate: { type: "boolean", example: false },
            requiresApproval: { type: "boolean", example: false },
            ageRestriction: { type: "integer", example: 18, nullable: true },
            status: {
              type: "string",
              enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED", "COMPLETED"],
              example: "APPROVED",
            },
            rejectionReason: { type: "string", nullable: true },
            category: { type: "string", example: "Technology", nullable: true },
            tags: { type: "array", items: { type: "string" }, nullable: true },
            organizerId: { type: "string" },
            organizer: { $ref: "#/components/schemas/User" },
            ticketTypes: {
              type: "array",
              items: { $ref: "#/components/schemas/TicketType" },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ========== TICKET TYPE SCHEMAS ==========
        TicketType: {
          type: "object",
          properties: {
            id: { type: "string" },
            eventId: { type: "string" },
            name: { type: "string", example: "General Admission" },
            description: { type: "string", example: "Standard entry ticket", nullable: true },
            category: {
              type: "string",
              enum: ["FREE", "PAID", "DONATION"],
              example: "PAID",
            },
            price: { type: "number", format: "decimal", example: 49.99 },
            originalPrice: { type: "number", format: "decimal", nullable: true },
            currency: { type: "string", example: "USD", default: "USD" },
            quantity: { type: "integer", example: 100 },
            quantitySold: { type: "integer", example: 25 },
            maxPerOrder: { type: "integer", example: 10 },
            minPerOrder: { type: "integer", example: 1 },
            salesStartDate: { type: "string", format: "date-time", nullable: true },
            salesEndDate: { type: "string", format: "date-time", nullable: true },
            isVisible: { type: "boolean", example: true },
            isTransferable: { type: "boolean", example: true },
            hasSeating: { type: "boolean", example: false },
            availableQuantity: { type: "integer", example: 75 },
          },
        },

        // ========== TICKET SCHEMAS ==========
        Ticket: {
          type: "object",
          properties: {
            id: { type: "string" },
            ticketNumber: { type: "string", example: "TKT-2024-001234" },
            ticketTypeId: { type: "string" },
            eventId: { type: "string" },
            userId: { type: "string" },
            status: {
              type: "string",
              enum: ["ACTIVE", "USED", "CANCELLED", "EXPIRED", "TRANSFERRED"],
              example: "ACTIVE",
            },
            qrCode: { type: "string", nullable: true },
            barcode: { type: "string", nullable: true },
            attendeeName: { type: "string", nullable: true },
            attendeeEmail: { type: "string", nullable: true },
            attendeePhone: { type: "string", nullable: true },
            pricePaid: { type: "number", format: "decimal", example: 49.99 },
            currency: { type: "string", example: "USD" },
            checkedInAt: { type: "string", format: "date-time", nullable: true },
            event: { $ref: "#/components/schemas/Event" },
            ticketType: { $ref: "#/components/schemas/TicketType" },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ========== PAYMENT SCHEMAS ==========
        Payment: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            orderNumber: { type: "string", example: "ORD-2024-001234" },
            status: {
              type: "string",
              enum: ["PENDING", "PROCESSING", "COMPLETED", "FAILED", "REFUNDED", "PARTIALLY_REFUNDED"],
              example: "COMPLETED",
            },
            method: {
              type: "string",
              enum: ["CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "MOBILE_PAYMENT", "STRIPE"],
              example: "STRIPE",
            },
            subtotal: { type: "number", format: "decimal", example: 99.98 },
            discount: { type: "number", format: "decimal", example: 0 },
            taxAmount: { type: "number", format: "decimal", example: 8.0 },
            serviceFee: { type: "number", format: "decimal", example: 5.0 },
            totalAmount: { type: "number", format: "decimal", example: 112.98 },
            currency: { type: "string", example: "USD" },
            platformCommission: { type: "number", format: "decimal", example: 11.3 },
            platformCommissionPct: { type: "number", format: "decimal", example: 10.0 },
            organizerPayout: { type: "number", format: "decimal", example: 101.68 },
            stripePaymentIntentId: { type: "string", nullable: true },
            receiptUrl: { type: "string", nullable: true },
            tickets: {
              type: "array",
              items: { $ref: "#/components/schemas/Ticket" },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ========== NOTIFICATION SCHEMAS ==========
        Notification: {
          type: "object",
          properties: {
            id: { type: "string" },
            userId: { type: "string" },
            eventId: { type: "string", nullable: true },
            type: {
              type: "string",
              enum: ["EMAIL", "SMS", "PUSH", "IN_APP"],
              example: "IN_APP",
            },
            title: { type: "string", example: "Event Reminder" },
            message: { type: "string", example: "Your event starts in 24 hours" },
            data: { type: "object", nullable: true },
            status: {
              type: "string",
              enum: ["PENDING", "SENT", "DELIVERED", "FAILED", "READ"],
              example: "DELIVERED",
            },
            readAt: { type: "string", format: "date-time", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ========== SEATING SCHEMAS ==========
        SeatingChart: {
          type: "object",
          properties: {
            id: { type: "string" },
            eventId: { type: "string" },
            name: { type: "string", example: "Main Auditorium" },
            description: { type: "string", nullable: true },
            chartData: { type: "object" },
            totalSeats: { type: "integer", example: 500 },
            availableSeats: { type: "integer", example: 350 },
            sections: {
              type: "array",
              items: { $ref: "#/components/schemas/SeatingSection" },
            },
          },
        },

        SeatingSection: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string", example: "VIP Section" },
            capacity: { type: "integer", example: 50 },
            priceMultiplier: { type: "number", format: "decimal", example: 1.5 },
            availableSeats: { type: "integer", example: 30 },
          },
        },

        Seat: {
          type: "object",
          properties: {
            id: { type: "string" },
            sectionId: { type: "string" },
            row: { type: "string", example: "A" },
            number: { type: "string", example: "12" },
            label: { type: "string", example: "A-12" },
            status: {
              type: "string",
              enum: ["AVAILABLE", "RESERVED", "SOLD", "BLOCKED"],
              example: "AVAILABLE",
            },
            isAccessible: { type: "boolean", example: false },
          },
        },

        // ========== WAITLIST SCHEMAS ==========
        WaitlistEntry: {
          type: "object",
          properties: {
            id: { type: "string" },
            eventId: { type: "string" },
            userId: { type: "string", nullable: true },
            email: { type: "string" },
            name: { type: "string", nullable: true },
            quantity: { type: "integer", example: 2 },
            status: {
              type: "string",
              enum: ["WAITING", "NOTIFIED", "CONVERTED", "EXPIRED", "CANCELLED"],
              example: "WAITING",
            },
            position: { type: "integer", example: 5 },
            createdAt: { type: "string", format: "date-time" },
          },
        },

        // ========== ANALYTICS SCHEMAS ==========
        OrganizerAnalytics: {
          type: "object",
          properties: {
            totalEvents: { type: "integer", example: 15 },
            totalTicketsSold: { type: "integer", example: 1250 },
            totalRevenue: { type: "number", format: "decimal", example: 52500.0 },
            upcomingEvents: { type: "integer", example: 5 },
            completedEvents: { type: "integer", example: 10 },
            averageTicketPrice: { type: "number", format: "decimal", example: 42.0 },
            topEvents: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  eventId: { type: "string" },
                  title: { type: "string" },
                  ticketsSold: { type: "integer" },
                  revenue: { type: "number" },
                },
              },
            },
          },
        },

        // ========== PAGINATION ==========
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            limit: { type: "integer", example: 10 },
            total: { type: "integer", example: 100 },
            totalPages: { type: "integer", example: 10 },
          },
        },
      },
    },

    // ============================================================================
    // API PATHS
    // ============================================================================

    paths: {
      // ==========================================================================
      // HEALTH ENDPOINTS
      // ==========================================================================

      "/health": {
        get: {
          tags: ["Health"],
          summary: "Basic health check",
          description: "Returns basic health status of the API",
          responses: {
            200: {
              description: "Service is healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "healthy" },
                      timestamp: { type: "string", format: "date-time" },
                      uptime: { type: "number", example: 12345.67 },
                      environment: { type: "string", example: "development" },
                      version: { type: "string", example: "1.0.0" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/health/detailed": {
        get: {
          tags: ["Health"],
          summary: "Detailed health check",
          description: "Returns detailed health status including database and Stripe connectivity",
          responses: {
            200: {
              description: "All services healthy",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      status: { type: "string", example: "healthy" },
                      timestamp: { type: "string" },
                      uptime: { type: "number" },
                      services: {
                        type: "object",
                        properties: {
                          database: {
                            type: "object",
                            properties: {
                              status: { type: "string", example: "connected" },
                              latency: { type: "string", example: "15ms" },
                            },
                          },
                          stripe: {
                            type: "object",
                            properties: {
                              status: { type: "string", example: "connected" },
                            },
                          },
                        },
                      },
                      memory: {
                        type: "object",
                        properties: {
                          heapUsed: { type: "string", example: "150MB" },
                          heapTotal: { type: "string", example: "200MB" },
                          rss: { type: "string", example: "250MB" },
                        },
                      },
                    },
                  },
                },
              },
            },
            503: {
              description: "Service unavailable",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/health/ready": {
        get: {
          tags: ["Health"],
          summary: "Readiness probe",
          description: "Kubernetes readiness probe - checks database connectivity",
          responses: {
            200: {
              description: "Service is ready",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      ready: { type: "boolean", example: true },
                    },
                  },
                },
              },
            },
            503: {
              description: "Service not ready",
            },
          },
        },
      },

      "/health/live": {
        get: {
          tags: ["Health"],
          summary: "Liveness probe",
          description: "Kubernetes liveness probe - checks if service is alive",
          responses: {
            200: {
              description: "Service is alive",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      alive: { type: "boolean", example: true },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/health/db": {
        get: {
          tags: ["Health"],
          summary: "Database health check",
          description: "Checks database connection and latency",
          responses: {
            200: {
              description: "Database is connected",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      connected: { type: "boolean", example: true },
                      latency: { type: "number", example: 15 },
                    },
                  },
                },
              },
            },
            503: {
              description: "Database connection failed",
            },
          },
        },
      },

      // ==========================================================================
      // AUTHENTICATION ENDPOINTS
      // ==========================================================================

      "/auth/register": {
        post: {
          tags: ["Authentication"],
          summary: "Register a new user",
          description: "Create a new user account with email and password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "firstName", "lastName"],
                  properties: {
                    email: { type: "string", format: "email", example: "user@example.com" },
                    password: { type: "string", format: "password", minLength: 8, example: "SecurePass123!" },
                    firstName: { type: "string", example: "John" },
                    lastName: { type: "string", example: "Doe" },
                    phone: { type: "string", example: "+1234567890" },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "User registered successfully",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            400: {
              description: "Validation error or email already exists",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ValidationError" },
                },
              },
            },
          },
        },
      },

      "/auth/login": {
        post: {
          tags: ["Authentication"],
          summary: "Login user",
          description: "Authenticate user with email and password",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email", example: "user@example.com" },
                    password: { type: "string", format: "password", example: "SecurePass123!" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/AuthResponse" },
                },
              },
            },
            401: {
              description: "Invalid credentials",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/auth/refresh-token": {
        post: {
          tags: ["Authentication"],
          summary: "Refresh access token",
          description: "Get a new access token using refresh token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string", example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Token refreshed successfully",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      data: { $ref: "#/components/schemas/AuthTokens" },
                    },
                  },
                },
              },
            },
            401: {
              description: "Invalid or expired refresh token",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/auth/logout": {
        post: {
          tags: ["Authentication"],
          summary: "Logout user",
          description: "Invalidate current refresh token",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Logout successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: { type: "string", example: "Logged out successfully" },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },

      "/auth/logout-all": {
        post: {
          tags: ["Authentication"],
          summary: "Logout from all devices",
          description: "Invalidate all refresh tokens for the user",
          security: [{ bearerAuth: [] }],
          responses: {
            200: {
              description: "Logged out from all devices",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: { type: "string", example: "Logged out from all devices" },
                    },
                  },
                },
              },
            },
            401: {
              description: "Unauthorized",
            },
          },
        },
      },

      "/auth/forgot-password": {
        post: {
          tags: ["Authentication"],
          summary: "Request password reset",
          description: "Send password reset email to user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email", example: "user@example.com" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Password reset email sent",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: { type: "string", example: "Password reset email sent" },
                    },
                  },
                },
              },
            },
          },
        },
      },

      "/auth/reset-password": {
        post: {
          tags: ["Authentication"],
          summary: "Reset password",
          description: "Reset user password using token from email",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "password"],
                  properties: {
                    token: { type: "string", example: "reset-token-abc123" },
                    password: { type: "string", format: "password", minLength: 8, example: "NewSecurePass123!" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Password reset successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean", example: true },
                      message: { type: "string", example: "Password has been reset successfully" },
                    },
                  },
                },
              },
            },
            400: {
              description: "Invalid or expired token",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/Error" },
                },
              },
            },
          },
        },
      },
    },
  },
  apis: ["./src/app/modules/**/*.routes.ts", "./src/routes/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
