// ============================================================================
// FILE: backend/prisma/seed.ts - Database Seed File (Idempotent)
// ============================================================================

import { PrismaClient, UserRole, EventStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ============================================================================
  // 1. Create Default Admin Users (Only if they don't exist)
  // ============================================================================
  console.log("👤 Checking admin users...");

  const hashedPassword = await bcrypt.hash("Admin@123456", 12);

  // Check if super admin exists
  const existingSuperAdmin = await prisma.user.findUnique({
    where: { email: "superadmin@eventflow.com" },
  });

  let superAdmin;
  if (!existingSuperAdmin) {
    superAdmin = await prisma.user.create({
      data: {
        email: "superadmin@eventflow.com",
        password: hashedPassword,
        firstName: "Super",
        lastName: "Admin",
        role: UserRole.SUPER_ADMIN,
        isActive: true,
        isEmailVerified: true,
      },
    });
    console.log(`✅ Created: ${superAdmin.email} (SUPER_ADMIN)`);
  } else {
    superAdmin = existingSuperAdmin;
    console.log(`⏭️  Skipped: superadmin@eventflow.com (already exists)`);
  }

  // Check if admin exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: "admin@eventflow.com" },
  });

  let admin;
  if (!existingAdmin) {
    admin = await prisma.user.create({
      data: {
        email: "admin@eventflow.com",
        password: hashedPassword,
        firstName: "Admin",
        lastName: "User",
        role: UserRole.ADMIN,
        isActive: true,
        isEmailVerified: true,
      },
    });
    console.log(`✅ Created: ${admin.email} (ADMIN)`);
  } else {
    admin = existingAdmin;
    console.log(`⏭️  Skipped: admin@eventflow.com (already exists)`);
  }

  // ============================================================================
  // 2. Create Test Organizers (Only if they don't exist)
  // ============================================================================
  // console.log("\n👥 Checking test organizers...");

  // const existingOrganizer1 = await prisma.user.findUnique({
  //   where: { email: "organizer1@eventflow.com" },
  // });

  // let organizer1;
  // if (!existingOrganizer1) {
  //   organizer1 = await prisma.user.create({
  //     data: {
  //       email: "organizer1@eventflow.com",
  //       password: hashedPassword,
  //       firstName: "John",
  //       lastName: "Organizer",
  //       role: UserRole.ORGANIZER,
  //       isActive: true,
  //       isEmailVerified: true,
  //       organizationName: "Tech Events Co.",
  //       organizationDesc: "We organize amazing tech conferences and workshops",
  //       website: "https://techevents.example.com",
  //     },
  //   });
  //   console.log(`✅ Created: ${organizer1.email}`);
  // } else {
  //   organizer1 = existingOrganizer1;
  //   console.log(`⏭️  Skipped: organizer1@eventflow.com (already exists)`);
  // }

  // const existingOrganizer2 = await prisma.user.findUnique({
  //   where: { email: "organizer2@eventflow.com" },
  // });

  // let organizer2;
  // if (!existingOrganizer2) {
  //   organizer2 = await prisma.user.create({
  //     data: {
  //       email: "organizer2@eventflow.com",
  //       password: hashedPassword,
  //       firstName: "Sarah",
  //       lastName: "Events",
  //       role: UserRole.ORGANIZER,
  //       isActive: true,
  //       isEmailVerified: true,
  //       organizationName: "Music Festival Productions",
  //       organizationDesc: "Premier music festival organizers",
  //       website: "https://musicfest.example.com",
  //     },
  //   });
  //   console.log(`✅ Created: ${organizer2.email}`);
  // } else {
  //   organizer2 = existingOrganizer2;
  //   console.log(`⏭️  Skipped: organizer2@eventflow.com (already exists)`);
  // }

  // // ============================================================================
  // // 3. Create Test Attendees (Only if they don't exist)
  // // ============================================================================
  // console.log("\n🎫 Checking test attendees...");

  // const attendeeEmails = [
  //   { email: "attendee1@example.com", firstName: "Alice", lastName: "Johnson" },
  //   { email: "attendee2@example.com", firstName: "Bob", lastName: "Smith" },
  // ];

  // let createdAttendees = 0;
  // let skippedAttendees = 0;

  // for (const attendeeData of attendeeEmails) {
  //   const existing = await prisma.user.findUnique({
  //     where: { email: attendeeData.email },
  //   });

  //   if (!existing) {
  //     await prisma.user.create({
  //       data: {
  //         email: attendeeData.email,
  //         password: hashedPassword,
  //         firstName: attendeeData.firstName,
  //         lastName: attendeeData.lastName,
  //         role: UserRole.ATTENDEE,
  //         isActive: true,
  //         isEmailVerified: true,
  //       },
  //     });
  //     createdAttendees++;
  //     console.log(`✅ Created: ${attendeeData.email}`);
  //   } else {
  //     skippedAttendees++;
  //     console.log(`⏭️  Skipped: ${attendeeData.email} (already exists)`);
  //   }
  // }

  // // ============================================================================
  // // 4. Create Test Events (Only if they don't exist)
  // // ============================================================================
  // console.log("\n🎪 Checking test events...");

  // const categories = [
  //   "conference",
  //   "workshop",
  //   "seminar",
  //   "concert",
  //   "festival",
  //   "sports",
  //   "networking",
  //   "fundraiser",
  //   "exhibition",
  //   "webinar",
  //   "general",
  // ];

  // // Event 1
  // const existingEvent1 = await prisma.event.findUnique({
  //   where: { slug: "tech-summit-2024" },
  // });

  // let event1;
  // if (!existingEvent1) {
  //   event1 = await prisma.event.create({
  //     data: {
  //       title: "Tech Summit 2024",
  //       slug: "tech-summit-2024",
  //       description:
  //         "Join us for the biggest tech conference of the year! Featuring keynotes from industry leaders, hands-on workshops, and networking opportunities.",
  //       shortDescription: "The premier technology conference featuring industry leaders and innovators",
  //       startDate: new Date("2024-06-15T09:00:00Z"),
  //       endDate: new Date("2024-06-17T18:00:00Z"),
  //       timezone: "America/New_York",
  //       isVirtual: false,
  //       venueName: "Convention Center",
  //       venueAddress: "123 Main St",
  //       city: "San Francisco",
  //       state: "CA",
  //       country: "USA",
  //       postalCode: "94102",
  //       capacity: 500,
  //       status: EventStatus.APPROVED,
  //       category: categories.includes("conference") ? "conference" : "general",
  //       tags: ["technology", "conference", "networking", "innovation"],
  //       publishedAt: new Date(),
  //       approvedAt: new Date(),
  //       approvedBy: superAdmin.id,
  //       organizerId: organizer1.id,
  //     },
  //   });
  //   console.log(`✅ Created event: ${event1.title}`);
  // } else {
  //   event1 = existingEvent1;
  //   console.log(`⏭️  Skipped event: tech-summit-2024 (already exists)`);
  // }

  // // Event 2
  // const existingEvent2 = await prisma.event.findUnique({
  //   where: { slug: "summer-music-festival-2024" },
  // });

  // let event2;
  // if (!existingEvent2) {
  //   event2 = await prisma.event.create({
  //     data: {
  //       title: "Summer Music Festival",
  //       slug: "summer-music-festival-2024",
  //       description:
  //         "Experience the best live music of the summer! Three days of non-stop entertainment with top artists from around the world.",
  //       shortDescription: "Three-day music festival featuring international artists",
  //       startDate: new Date("2024-07-20T12:00:00Z"),
  //       endDate: new Date("2024-07-22T23:00:00Z"),
  //       timezone: "America/Los_Angeles",
  //       isVirtual: false,
  //       venueName: "Outdoor Amphitheater",
  //       venueAddress: "456 Festival Blvd",
  //       city: "Los Angeles",
  //       state: "CA",
  //       country: "USA",
  //       postalCode: "90001",
  //       capacity: 2000,
  //       status: EventStatus.APPROVED,
  //       category: "festival",
  //       tags: ["music", "festival", "outdoor", "summer"],
  //       publishedAt: new Date(),
  //       approvedAt: new Date(),
  //       approvedBy: admin.id,
  //       organizerId: organizer2.id,
  //     },
  //   });
  //   console.log(`✅ Created event: ${event2.title}`);
  // } else {
  //   event2 = existingEvent2;
  //   console.log(`⏭️  Skipped event: summer-music-festival-2024 (already exists)`);
  // }

  // // Event 3
  // const existingEvent3 = await prisma.event.findUnique({
  //   where: { slug: "ai-ml-workshop-2024" },
  // });

  // let event3;
  // if (!existingEvent3) {
  //   event3 = await prisma.event.create({
  //     data: {
  //       title: "AI & Machine Learning Workshop",
  //       slug: "ai-ml-workshop-2024",
  //       description:
  //         "Hands-on workshop covering the latest in AI and machine learning. Perfect for developers and data scientists.",
  //       shortDescription: "Hands-on AI/ML workshop for developers",
  //       startDate: new Date("2024-08-10T10:00:00Z"),
  //       endDate: new Date("2024-08-10T17:00:00Z"),
  //       timezone: "America/New_York",
  //       isVirtual: true,
  //       virtualLink: "https://zoom.us/j/example",
  //       virtualPlatform: "Zoom",
  //       capacity: 100,
  //       status: EventStatus.APPROVED,
  //       category: "workshop",
  //       tags: ["ai", "ml", "workshop", "virtual", "technology"],
  //       publishedAt: new Date(),
  //       approvedAt: new Date(),
  //       approvedBy: superAdmin.id,
  //       organizerId: organizer1.id,
  //     },
  //   });
  //   console.log(`✅ Created event: ${event3.title}`);
  // } else {
  //   event3 = existingEvent3;
  //   console.log(`⏭️  Skipped event: ai-ml-workshop-2024 (already exists)`);
  // }

  // // Event 4 - Pending
  // const existingEvent4 = await prisma.event.findUnique({
  //   where: { slug: "startup-pitch-night-2024" },
  // });

  // let event4;
  // if (!existingEvent4) {
  //   event4 = await prisma.event.create({
  //     data: {
  //       title: "Startup Pitch Night",
  //       slug: "startup-pitch-night-2024",
  //       description: "Watch innovative startups pitch their ideas to investors. Network with entrepreneurs and VCs.",
  //       shortDescription: "Startup pitching competition and networking event",
  //       startDate: new Date("2024-09-05T18:00:00Z"),
  //       endDate: new Date("2024-09-05T21:00:00Z"),
  //       timezone: "America/New_York",
  //       isVirtual: false,
  //       venueName: "Innovation Hub",
  //       venueAddress: "789 Startup Ave",
  //       city: "New York",
  //       state: "NY",
  //       country: "USA",
  //       postalCode: "10001",
  //       capacity: 200,
  //       status: EventStatus.PENDING_APPROVAL,
  //       category: "networking",
  //       tags: ["startup", "pitch", "networking", "investment"],
  //       organizerId: organizer1.id,
  //     },
  //   });
  //   console.log(`✅ Created event: ${event4.title} (PENDING)`);
  // } else {
  //   event4 = existingEvent4;
  //   console.log(`⏭️  Skipped event: startup-pitch-night-2024 (already exists)`);
  // }

  // // ============================================================================
  // // 5. Create Ticket Types (Only if they don't exist for each event)
  // // ============================================================================
  // console.log("\n🎟️  Checking ticket types...");

  // // Event 1 - Tech Summit
  // const existingTickets1 = await prisma.ticketType.findMany({
  //   where: { eventId: event1.id },
  // });

  // if (existingTickets1.length === 0) {
  //   const ticketTypes1 = await Promise.all([
  //     prisma.ticketType.create({
  //       data: {
  //         eventId: event1.id,
  //         name: "Early Bird",
  //         description: "Early bird special pricing",
  //         category: "PAID",
  //         price: 299.99,
  //         originalPrice: 399.99,
  //         currency: "USD",
  //         quantity: 100,
  //         quantitySold: 45,
  //         maxPerOrder: 5,
  //         sortOrder: 0,
  //       },
  //     }),
  //     prisma.ticketType.create({
  //       data: {
  //         eventId: event1.id,
  //         name: "Regular",
  //         description: "Standard admission",
  //         category: "PAID",
  //         price: 399.99,
  //         currency: "USD",
  //         quantity: 300,
  //         quantitySold: 120,
  //         maxPerOrder: 5,
  //         sortOrder: 1,
  //       },
  //     }),
  //     prisma.ticketType.create({
  //       data: {
  //         eventId: event1.id,
  //         name: "VIP",
  //         description: "VIP access with exclusive perks",
  //         category: "PAID",
  //         price: 799.99,
  //         currency: "USD",
  //         quantity: 100,
  //         quantitySold: 67,
  //         maxPerOrder: 2,
  //         sortOrder: 2,
  //       },
  //     }),
  //   ]);
  //   console.log(`✅ Created ${ticketTypes1.length} ticket types for ${event1.title}`);
  // } else {
  //   console.log(`⏭️  Skipped ticket types for ${event1.title} (already exist)`);
  // }

  // // Event 2 - Music Festival
  // const existingTickets2 = await prisma.ticketType.findMany({
  //   where: { eventId: event2.id },
  // });

  // if (existingTickets2.length === 0) {
  //   const ticketTypes2 = await Promise.all([
  //     prisma.ticketType.create({
  //       data: {
  //         eventId: event2.id,
  //         name: "General Admission",
  //         description: "3-day festival pass",
  //         category: "PAID",
  //         price: 149.99,
  //         currency: "USD",
  //         quantity: 1500,
  //         quantitySold: 823,
  //         maxPerOrder: 10,
  //         sortOrder: 0,
  //       },
  //     }),
  //     prisma.ticketType.create({
  //       data: {
  //         eventId: event2.id,
  //         name: "VIP Weekend Pass",
  //         description: "VIP access all 3 days",
  //         category: "PAID",
  //         price: 399.99,
  //         currency: "USD",
  //         quantity: 500,
  //         quantitySold: 312,
  //         maxPerOrder: 4,
  //         sortOrder: 1,
  //       },
  //     }),
  //   ]);
  //   console.log(`✅ Created ${ticketTypes2.length} ticket types for ${event2.title}`);
  // } else {
  //   console.log(`⏭️  Skipped ticket types for ${event2.title} (already exist)`);
  // }

  // // Event 3 - AI Workshop
  // const existingTickets3 = await prisma.ticketType.findMany({
  //   where: { eventId: event3.id },
  // });

  // if (existingTickets3.length === 0) {
  //   const ticketTypes3 = await Promise.all([
  //     prisma.ticketType.create({
  //       data: {
  //         eventId: event3.id,
  //         name: "Workshop Access",
  //         description: "Full workshop access with materials",
  //         category: "PAID",
  //         price: 99.99,
  //         currency: "USD",
  //         quantity: 100,
  //         quantitySold: 78,
  //         maxPerOrder: 1,
  //         sortOrder: 0,
  //       },
  //     }),
  //   ]);
  //   console.log(`✅ Created ${ticketTypes3.length} ticket type for ${event3.title}`);
  // } else {
  //   console.log(`⏭️  Skipped ticket types for ${event3.title} (already exist)`);
  // }

  // // ============================================================================
  // // 6. Create Promo Codes (Only if they don't exist)
  // // ============================================================================
  // console.log("\n🎁 Checking promo codes...");

  // const promoCodesToCreate = [
  //   {
  //     code: "EARLY2024",
  //     description: "Early bird discount - 20% off",
  //     discountType: "PERCENTAGE",
  //     discountValue: 20,
  //     maxUses: 100,
  //     usedCount: 23,
  //     validFrom: new Date("2024-01-01"),
  //     validUntil: new Date("2024-12-31"),
  //     isActive: true,
  //   },
  //   {
  //     code: "TECHSUMMIT50",
  //     description: "$50 off Tech Summit tickets",
  //     discountType: "FIXED",
  //     discountValue: 50,
  //     maxDiscount: 50,
  //     maxUses: 50,
  //     usedCount: 12,
  //     validFrom: new Date("2024-01-01"),
  //     validUntil: new Date("2024-06-14"),
  //     isActive: true,
  //   },
  // ];

  // let createdPromoCodes = 0;
  // let skippedPromoCodes = 0;

  // for (const promoData of promoCodesToCreate) {
  //   const existing = await prisma.promoCode.findUnique({
  //     where: { code: promoData.code },
  //   });

  //   if (!existing) {
  //     await prisma.promoCode.create({ data: promoData });
  //     createdPromoCodes++;
  //     console.log(`✅ Created promo code: ${promoData.code}`);
  //   } else {
  //     skippedPromoCodes++;
  //     console.log(`⏭️  Skipped promo code: ${promoData.code} (already exists)`);
  //   }
  // }

  // ============================================================================
  // Summary
  // ============================================================================
  console.log("\n✨ Database seed completed successfully!");
  console.log("\n📊 Summary:");
  // console.log(`   👥 Users: 2 admins, 2 organizers, ${createdAttendees + skippedAttendees} attendees`);
  // console.log(`   🎪 Events: 4 total`);
  // console.log(`   🎟️  Ticket Types: Multiple types across events`);
  // console.log(`   🎁 Promo Codes: ${createdPromoCodes + skippedPromoCodes} total`);
  console.log("\n🔐 Test Credentials:");
  console.log(`   Super Admin: superadmin@eventflow.com / Admin@123456`);
  console.log(`   Admin: admin@eventflow.com / Admin@123456`);
  // console.log(`   Organizer: organizer1@eventflow.com / Admin@123456`);
  // console.log(`   Attendee: attendee1@example.com / Admin@123456`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
