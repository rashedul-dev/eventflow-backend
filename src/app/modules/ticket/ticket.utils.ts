import crypto from "crypto"
import QRCode from "qrcode"

// Generate unique ticket number
export const generateTicketNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = crypto.randomBytes(4).toString("hex").toUpperCase()
  return `TKT-${timestamp}-${random}`
}

// Generate QR code data URL
export const generateQRCode = async (data: string): Promise<string> => {
  try {
    const qrCode = await QRCode.toDataURL(data, {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 300,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
    return qrCode
  } catch (error) {
    throw new Error("Failed to generate QR code")
  }
}

// Generate unique QR code identifier
export const generateQRCodeId = (): string => {
  return crypto.randomBytes(16).toString("hex")
}

// Generate barcode (simple numeric)
export const generateBarcode = (): string => {
  const timestamp = Date.now().toString().slice(-8)
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0")
  return `${timestamp}${random}`
}

// Generate ICS calendar file content
export const generateICSContent = (event: {
  title: string
  description: string
  startDate: Date
  endDate: Date
  location?: string
  virtualLink?: string
  organizerName?: string
  organizerEmail?: string
}): string => {
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z"
  }

  const escapeText = (text: string): string => {
    return text.replace(/[\\;,\n]/g, (match) => {
      switch (match) {
        case "\\":
          return "\\\\"
        case ";":
          return "\\;"
        case ",":
          return "\\,"
        case "\n":
          return "\\n"
        default:
          return match
      }
    })
  }

  const uid = crypto.randomUUID()
  const now = new Date()
  const location = event.location || event.virtualLink || ""

  let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EventFlow//Event Tickets//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${formatDate(now)}
DTSTART:${formatDate(event.startDate)}
DTEND:${formatDate(event.endDate)}
SUMMARY:${escapeText(event.title)}
DESCRIPTION:${escapeText(event.description)}
LOCATION:${escapeText(location)}
STATUS:CONFIRMED`

  if (event.organizerEmail) {
    icsContent += `\nORGANIZER;CN=${event.organizerName || "EventFlow"}:mailto:${event.organizerEmail}`
  }

  icsContent += `
END:VEVENT
END:VCALENDAR`

  return icsContent
}

// Calculate ticket price with promo code
export const calculateTicketPrice = (
  basePrice: number,
  quantity: number,
  promoDiscount?: { type: "PERCENTAGE" | "FIXED"; value: number; maxDiscount?: number },
): { subtotal: number; discount: number; total: number } => {
  const subtotal = basePrice * quantity
  let discount = 0

  if (promoDiscount) {
    if (promoDiscount.type === "PERCENTAGE") {
      discount = (subtotal * promoDiscount.value) / 100
      if (promoDiscount.maxDiscount && discount > promoDiscount.maxDiscount) {
        discount = promoDiscount.maxDiscount
      }
    } else {
      discount = promoDiscount.value
    }
  }

  return {
    subtotal,
    discount,
    total: Math.max(0, subtotal - discount),
  }
}
