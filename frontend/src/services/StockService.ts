import { api } from '../lib/api'

export interface StockItem {
  id: string
  name: string
  type: string
  unit: string
  stock_quantity: number
  package_size: number
  last_price: number
}

export interface Movement {
  id: string
  type: string
  quantity: number
  notes: string | null
  created_at: string
}

interface PaginatedResult<T> {
  items: T[]
  meta: { current_page: number; last_page: number; total?: number }
}

export const StockService = {
  async getPaginated(page = 1, search = ''): Promise<PaginatedResult<StockItem>> {
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('search', search)
    const res = await api.get<{ data: { data: StockItem[]; current_page: number; last_page: number; total: number } }>(`/stock?${params}`)
    const p = res.data
    return { items: p.data, meta: { current_page: p.current_page, last_page: p.last_page, total: p.total } }
  },

  async createPurchase(data: unknown): Promise<unknown> {
    const res = await api.post<{ data: unknown }>('/purchases', data)
    return res.data
  },

  async adjust(id: string, data: { stock_quantity: number; min_stock?: number | null; movement_date?: string | null; notes?: string | null }): Promise<unknown> {
    const res = await api.patch<{ data: unknown }>(`/ingredients/${id}/stock`, data)
    return res.data
  },

  async getMovements(id: string, page = 1): Promise<PaginatedResult<Movement>> {
    const res = await api.get<{ data: { data: Movement[]; current_page: number; last_page: number } }>(`/ingredients/${id}/movements?page=${page}`)
    const p = res.data
    return { items: p.data, meta: { current_page: p.current_page, last_page: p.last_page } }
  },

  async resetStock(id: string): Promise<void> {
    await api.delete(`/ingredients/${id}/movements`)
  },
}
