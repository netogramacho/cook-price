import { api } from '../lib/api'

export interface Insumo {
  id: string
  name: string
  type: 'insumo'
  unit: string
  package_size: number
  last_price: number
}

interface PaginatedResult<T> {
  items: T[]
  meta: { current_page: number; last_page: number; total: number }
}

export const InsumoService = {
  async getAll(): Promise<Insumo[]> {
    const res = await api.get<{ data: { data: Insumo[] } }>('/insumos?per_page=100')
    return res.data.data
  },

  async getPaginated(page = 1, search = ''): Promise<PaginatedResult<Insumo>> {
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('search', search)
    const res = await api.get<{ data: { data: Insumo[]; current_page: number; last_page: number; total: number } }>(`/insumos?${params}`)
    const p = res.data
    return { items: p.data, meta: { current_page: p.current_page, last_page: p.last_page, total: p.total } }
  },

  async create(data: Partial<Insumo>): Promise<Insumo> {
    const res = await api.post<{ data: Insumo }>('/insumos', data)
    return res.data
  },

  async update(id: string, data: Partial<Insumo>): Promise<void> {
    await api.put(`/insumos/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/insumos/${id}`)
  },
}
