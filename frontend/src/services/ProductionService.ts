import { api } from '../lib/api'

export interface ProductionSnapshot {
  recipe_name: string
  recipe_updated_at: string
  yield: number
  yield_unit: string
  invisible_cost_pct: number
  profit_multiplier: number
  ingredients: {
    name: string
    type: string
    unit: string
    quantity: number
    unit_price: number
    subtotal: number
  }[]
  ingredients_cost: number
  packaging_cost: number
  invisible_cost: number
  production_cost: number
  suggested_price_per_yield: number
}

export interface ProductionSummaryPeriod {
  batches: number
  items: number
  cost: number
}

export interface ProductionSummary {
  today: ProductionSummaryPeriod
  month: ProductionSummaryPeriod
}

export interface Production {
  id: string
  recipe_id: string | null
  quantity_recipes: number
  total_yield: number
  total_cost: number
  unit_cost: number
  notes: string | null
  snapshot: ProductionSnapshot
  produced_at: string
  created_at: string
}

export const ProductionService = {
  async getSummary(): Promise<ProductionSummary> {
    const res = await api.get<{ data: ProductionSummary }>('/productions/summary')
    return res.data
  },

  async getPaginated(page = 1): Promise<{ items: Production[]; meta: { current_page: number; last_page: number; total: number } }> {
    const res = await api.get<{ data: { data: Production[]; current_page: number; last_page: number; total: number } }>(`/productions?page=${page}`)
    const p = res.data
    return { items: p.data, meta: { current_page: p.current_page, last_page: p.last_page, total: p.total } }
  },

  async create(data: { recipe_id: string; notes?: string }): Promise<Production> {
    const res = await api.post<{ data: Production }>('/productions', data)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/productions/${id}`)
  },
}
