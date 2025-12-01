import { v2 as cloudinary, type UploadApiResponse, type UploadApiErrorResponse } from "cloudinary"
import multer from "multer"
import fs from "fs"
import path from "path"
import { config } from "../../config"
import type { Express } from "express"

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary?.cloudName,
  api_key: config.cloudinary?.apiKey,
  api_secret: config.cloudinary?.apiSecret,
})

// Multer storage configuration for temporary local storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads")

    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    cb(null, uploadDir)
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname)
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`)
  },
})

// File filter for allowed file types
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"]

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(", ")}`))
  }
}

// Multer upload instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
})

// Upload types
export interface ICloudinaryResponse {
  secure_url: string
  public_id: string
  format: string
  width: number
  height: number
  bytes: number
  resource_type: string
}

export interface IUploadFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  destination: string
  filename: string
  path: string
  size: number
}

/**
 * Uploads a file to Cloudinary
 */
export const uploadToCloudinary = async (file: IUploadFile, folder = "eventflow"): Promise<ICloudinaryResponse> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      file.path,
      {
        folder,
        resource_type: "auto",
        public_id: `${folder}/${path.parse(file.filename).name}`,
      },
      (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
        // Remove local file after upload
        fs.unlink(file.path, (unlinkErr) => {
          if (unlinkErr) console.error("Error deleting local file:", unlinkErr)
        })

        if (error) {
          reject(error)
        } else if (result) {
          resolve({
            secure_url: result.secure_url,
            public_id: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            resource_type: result.resource_type,
          })
        }
      },
    )
  })
}

/**
 * Uploads multiple files to Cloudinary
 */
export const uploadMultipleToCloudinary = async (
  files: IUploadFile[],
  folder = "eventflow",
): Promise<ICloudinaryResponse[]> => {
  const uploadPromises = files.map((file) => uploadToCloudinary(file, folder))
  return Promise.all(uploadPromises)
}

/**
 * Deletes a file from Cloudinary by public ID
 */
export const deleteFromCloudinary = async (publicId: string): Promise<{ result: string }> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}

/**
 * Deletes multiple files from Cloudinary
 */
export const deleteMultipleFromCloudinary = async (
  publicIds: string[],
): Promise<{ deleted: Record<string, string> }> => {
  return new Promise((resolve, reject) => {
    cloudinary.api.delete_resources(publicIds, (error, result) => {
      if (error) {
        reject(error)
      } else {
        resolve(result)
      }
    })
  })
}

export const FileUploader = {
  upload,
  uploadToCloudinary,
  uploadMultipleToCloudinary,
  deleteFromCloudinary,
  deleteMultipleFromCloudinary,
}
