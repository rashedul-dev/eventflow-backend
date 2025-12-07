// // ============================================================================
// // FILE: backend/src/config/swagger.ts - Swagger Configuration
// // ============================================================================

// import swaggerJsdoc from "swagger-jsdoc";
// import { config } from "./index";

// const options: swaggerJsdoc.Options = {
//   definition: {
//     openapi: "3.0.0",
//     info: {
//       title: "EventFlow API",
//       version: "1.0.0",
//       description: "Event Management Platform - Complete API Documentation",
//       contact: {
//         name: "EventFlow Support",
//         email: "rashedulislam.edge@gmail.com",
//       },
//       license: {
//         name: "MIT",
//         url: "https://opensource.org/licenses/MIT",
//       },
//     },
//     servers: [
//       {
//         url: config.apiBaseUrl,
//         description: config.isDevelopment ? "Development server" : "Production server",
//       },
//     ],
//     components: {
//       securitySchemes: {
//         bearerAuth: {
//           type: "http",
//           scheme: "bearer",
//           bearerFormat: "JWT",
//         },
//       },
//       schemas: {
//         Error: {
//           type: "object",
//           properties: {
//             success: { type: "boolean", example: false },
//             message: { type: "string" },
//             errorMessages: {
//               type: "array",
//               items: {
//                 type: "object",
//                 properties: {
//                   path: { type: "string" },
//                   message: { type: "string" },
//                 },
//               },
//             },
//           },
//         },
//         User: {
//           type: "object",
//           properties: {
//             id: { type: "string" },
//             email: { type: "string", format: "email" },
//             firstName: { type: "string" },
//             lastName: { type: "string" },
//             role: { type: "string", enum: ["SUPER_ADMIN", "ADMIN", "ORGANIZER", "ATTENDEE"] },
//             isEmailVerified: { type: "boolean" },
//             createdAt: { type: "string", format: "date-time" },
//           },
//         },
//         Event: {
//           type: "object",
//           properties: {
//             id: { type: "string" },
//             title: { type: "string" },
//             slug: { type: "string" },
//             description: { type: "string" },
//             startDate: { type: "string", format: "date-time" },
//             endDate: { type: "string", format: "date-time" },
//             status: { type: "string", enum: ["DRAFT", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"] },
//             isVirtual: { type: "boolean" },
//             capacity: { type: "integer" },
//           },
//         },
//         Ticket: {
//           type: "object",
//           properties: {
//             id: { type: "string" },
//             ticketNumber: { type: "string" },
//             status: { type: "string", enum: ["ACTIVE", "USED", "CANCELLED", "EXPIRED"] },
//             qrCode: { type: "string" },
//             pricePaid: { type: "number" },
//           },
//         },
//       },
//     },
//     tags: [
//       { name: "Authentication", description: "Auth endpoints" },
//       { name: "Users", description: "User management" },
//       { name: "Events", description: "Event management" },
//       { name: "Tickets", description: "Ticket operations" },
//       { name: "Payments", description: "Payment processing" },
//       { name: "Admin", description: "Admin operations" },
//       { name: "Notifications", description: "Notification system" },
//       { name: "Analytics", description: "Analytics & reporting" },
//       { name: "Health", description: "Health check endpoints" },
//     ],
//   },
//   apis: ["./src/app/modules/**/*.routes.ts", "./src/routes/*.ts"],
// };

// export const swaggerSpec = swaggerJsdoc(options);
