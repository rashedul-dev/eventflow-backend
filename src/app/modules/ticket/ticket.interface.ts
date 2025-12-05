import type { TicketStatus } from "@prisma/client"

export interface ITicketFilterRequest {
  searchTerm?: string
  status?: TicketStatus
  eventId?: string
  ticketTypeId?: string
  userId?: string
  checkedIn?: boolean
}

export interface IPurchaseTicket {
  eventId: string
  ticketTypeId: string
  quantity: number
  attendees?: Array<{
    name: string
    email: string
    phone?: string
  }>
  seatIds?: string[]
  promoCode?: string
}

export interface ITransferTicket {
  recipientEmail: string
  recipientName?: string
}

export interface IValidateTicket {
  qrCode?: string
  ticketNumber?: string
}

export interface ITicket {
  id: string
  ticketNumber: string
  ticketTypeId: string
  eventId: string
  userId: string
  paymentId: string | null
  status: TicketStatus
  qrCode: string | null
  barcode: string | null
  attendeeName: string | null
  attendeeEmail: string | null
  attendeePhone: string | null
  pricePaid: number
  currency: string
  seatId: string | null
  checkedInAt: Date | null
  checkedInBy: string | null
  originalUserId: string | null
  transferredAt: Date | null
  createdAt: Date
  updatedAt: Date
}
