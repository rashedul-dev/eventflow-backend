import type { EventStatus } from "@prisma/client";

export interface IEventFilterRequest {
  searchTerm?: string;
  status?: EventStatus;
  category?: string;
  isVirtual?: boolean;
  isPrivate?: boolean;
  city?: string;
  state?: string;
  country?: string;
  organizerId?: string;
  startDateFrom?: string;
  startDateTo?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface ICreateEvent {
  title: string;
  description: string;
  shortDescription?: string;
  startDate: string;
  endDate: string;
  timezone?: string;
  isVirtual?: boolean;
  venueName?: string;
  venueAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  virtualLink?: string;
  virtualPlatform?: string;
  coverImage?: string;
  thumbnailImage?: string;
  images?: string[];
  capacity?: number;
  isPrivate?: boolean;
  requiresApproval?: boolean;
  ageRestriction?: number;
  category?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  ticketTypes?: Array<{
    name: string;
    description?: string;
    category: "FREE" | "PAID" | "DONATION";
    price: number;
    quantity: number;
    minPerOrder?: number;
    maxPerOrder?: number;
    sortOrder?: number;
    quantityAvailable?: number;
    quantitySold?: number;
  }>;
}

export interface IUpdateEvent extends Partial<ICreateEvent> {
  status?: EventStatus;
}

export interface IEventApproval {
  status: "APPROVED" | "REJECTED";
  rejectionReason?: string;
}

export interface ICoOrganizerInvite {
  email: string;
  permissions?: string[];
}

export interface IEvent {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string | null;
  startDate: Date;
  endDate: Date;
  timezone: string;
  isVirtual: boolean;
  venueName: string | null;
  venueAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  virtualLink: string | null;
  virtualPlatform: string | null;
  coverImage: string | null;
  thumbnailImage: string | null;
  images: string[] | null;
  capacity: number | null;
  isPrivate: boolean;
  requiresApproval: boolean;
  ageRestriction: number | null;
  status: EventStatus;
  rejectionReason: string | null;
  approvedAt: Date | null;
  approvedBy: string | null;
  publishedAt: Date | null;
  category: string | null;
  tags: string[] | null;
  metaTitle: string | null;
  metaDescription: string | null;
  organizerId: string;
  createdAt: Date;
  updatedAt: Date;
}
