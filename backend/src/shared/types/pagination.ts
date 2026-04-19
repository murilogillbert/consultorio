export interface PaginationParams {
  page?: number
  limit?: number
}

export interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

export function buildPaginationMeta(total: number, page: number, limit: number) {
  return { total, page, limit, pages: Math.ceil(total / limit) }
}
