import { api } from '../lib/api'

export interface PurchaseItem {
  id: string
  ingredient: { id: string; name: string; unit: string }
  quantity: number
  unit_price: number
  num_packages: number
  price_paid: number
  total_price: number
}

export interface Purchase {
  id: string
  purchased_at: string | null
  notes: string | null
  total_value: number
  items: PurchaseItem[]
}

interface PaginatedResult<T> {
  items: T[]
  meta: { current_page: number; last_page: number; total: number }
}

export const PurchaseService = {
  async getPaginated(page = 1, search = ''): Promise<PaginatedResult<Purchase>> {
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('search', search)
    const res = await api.get<{ data: { data: Purchase[]; current_page: number; last_page: number; total: number } }>(`/purchases?${params}`)
    const p = res.data
    return { items: p.data, meta: { current_page: p.current_page, last_page: p.last_page, total: p.total } }
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/purchases/${id}`)
  },

  async resetAndDelete(id: string): Promise<void> {
    await api.post(`/purchases/${id}/reset-and-delete`)
  },
}
