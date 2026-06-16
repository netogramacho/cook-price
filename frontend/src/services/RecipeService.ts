import { api } from '../lib/api'

export interface Recipe {
  id: string
  name: string
  description?: string | null
  yield: number
  yield_unit: string
  invisible_cost_pct?: number
  profit_multiplier: number
  ingredients_cost: number
  packaging_cost: number
  total_cost: number
  sale_price: number
  ingredients?: RecipeIngredient[]
  packaging?: RecipePackaging[]
}

export interface RecipeIngredient {
  id: string
  ingredient_id: string
  name: string
  type: string
  unit: string
  quantity: number
  subtotal: number
}

export interface RecipePackaging {
  id: string
  ingredient_id: string
  name: string
  quantity: number
  subtotal: number
}

export interface IngredientInput {
  ingredient_id: string
  quantity: number
}

interface RecipeInput extends Omit<Partial<Recipe>, 'ingredients' | 'packaging'> {
  ingredients?: IngredientInput[]
  packaging?: IngredientInput[]
}

interface PaginatedResult<T> {
  items: T[]
  meta: { current_page: number; last_page: number; total: number }
}

export const RecipeService = {
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
}
