import { api } from '../lib/api'

export interface Ingredient {
  id: string
  name: string
  type: 'ingredient' | 'packaging'
  unit: string
  package_size: number
  last_price: number
}

interface PaginatedResult<T> {
  items: T[]
  meta: { current_page: number; last_page: number; total: number }
}

export const IngredientService = {
  async getAll(): Promise<Ingredient[]> {
    const res = await api.get<{ data: { data: Ingredient[] } }>('/ingredients?per_page=100')
    return res.data.data
  },

  async getPaginated(page = 1, search = ''): Promise<PaginatedResult<Ingredient>> {
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('search', search)
    const res = await api.get<{ data: { data: Ingredient[]; current_page: number; last_page: number; total: number } }>(`/ingredients?${params}`)
    const p = res.data
    return { items: p.data, meta: { current_page: p.current_page, last_page: p.last_page, total: p.total } }
  },

  async create(data: Partial<Ingredient>): Promise<Ingredient> {
    const res = await api.post<{ data: Ingredient }>('/ingredients', data)
    return res.data
  },

  async update(id: string, data: Partial<Ingredient>): Promise<void> {
    await api.put(`/ingredients/${id}`, data)
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/ingredients/${id}`)
  },
}
