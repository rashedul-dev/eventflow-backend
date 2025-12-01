export interface IPaginationOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: "asc" | "desc"
}

export interface IPaginationResult {
  page: number
  limit: number
  skip: number
  sortBy: string
  sortOrder: "asc" | "desc"
}

export interface IGenericPaginationResponse<T> {
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  data: T
}

export function calculatePagination(options: IPaginationOptions): IPaginationResult {
  const page = Number(options.page) || 1
  const limit = Number(options.limit) || 10
  const skip = (page - 1) * limit
  const sortBy = options.sortBy || "createdAt"
  const sortOrder = options.sortOrder || "desc"

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
  }
}

export function createPaginatedResponse<T>(
  data: T,
  total: number,
  options: IPaginationResult,
): IGenericPaginationResponse<T> {
  return {
    meta: {
      page: options.page,
      limit: options.limit,
      total,
      totalPages: Math.ceil(total / options.limit),
    },
    data,
  }
}

export const paginationFields = ["page", "limit", "sortBy", "sortOrder"]
