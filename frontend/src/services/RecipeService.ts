import { api } from '../lib/api'

export interface Recipe {
  id: string
  name: string
  description: string | null
  yield: number
  yield_unit: string
  active: boolean
  created_at: string
  updated_at: string
  ingredients: RecipeIngredient[]
  ingredients_cost: number
  insumos_cost: number
  invisible_cost_pct: number | null
  invisible_cost: number | null
  production_cost: number | null
  profit_multiplier: number | null
  profit_margin_pct: number | null
  suggested_price: number | null
  base_cost: number
  cost_per_yield: number | null
  suggested_price_per_yield: number | null
}

export interface RecipeIngredient {
  id: string
  name: string
  type: string
  unit: string
  package_size: number
  last_price: number
  price_per_unit: number
  quantity: number
  subtotal: number
}

export interface IngredientInput {
  ingredient_id: string
  quantity: number
  unit: string
}

interface RecipeInput extends Omit<Partial<Recipe>, 'ingredients'> {
  ingredients?: IngredientInput[]
}

interface PaginatedResult<T> {
  items: T[]
  meta: { current_page: number; last_page: number; total: number }
}

export const RecipeService = {
  async getAll(): Promise<Recipe[]> {
    const res = await api.get<{ data: { data: Recipe[] } }>('/recipes?per_page=100')
    return res.data.data
  },

  async getPaginated(page = 1, search = ''): Promise<PaginatedResult<Recipe>> {
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('search', search)
    const res = await api.get<{ data: { data: Recipe[]; current_page: number; last_page: number; total: number } }>(`/recipes?${params}`)
    const p = res.data
    return { items: p.data, meta: { current_page: p.current_page, last_page: p.last_page, total: p.total } }
  },

  async getById(id: string): Promise<Recipe> {
    const res = await api.get<{ data: Recipe }>(`/recipes/${id}`)
    return res.data
  },

  async create(data: RecipeInput): Promise<void> {
    await api.post('/recipes', data)
  },

  async update(id: string, data: RecipeInput): Promise<Recipe> {
    const res = await api.put<{ data: Recipe }>(`/recipes/${id}`, data)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/recipes/${id}`)
  },

  async duplicate(id: string): Promise<Recipe> {
    const res = await api.post<{ data: Recipe }>(`/recipes/${id}/duplicate`, {})
    return res.data
  },
}
