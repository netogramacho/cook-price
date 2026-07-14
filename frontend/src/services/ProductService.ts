import { api } from '../lib/api'

export interface ProductRecipeLine {
  id: string
  name: string
  yield_unit: string
  recipe_cost: number
  quantity: number
  subtotal: number
}

export interface ProductInsumoLine {
  id: string
  name: string
  unit: string
  package_size: number
  last_price: number
  quantity: number
  subtotal: number
}

export interface Product {
  id: string
  name: string
  description: string | null
  yield: number
  yield_unit: string
  invisible_cost_pct: number
  profit_multiplier: number
  active: boolean
  created_at: string
  updated_at: string
  recipes: ProductRecipeLine[]
  ingredients: ProductInsumoLine[]
  insumos: ProductInsumoLine[]
  recipes_cost: number
  ingredients_cost: number
  insumos_cost: number
  base_cost: number
  invisible_cost: number
  production_cost: number
  profit_margin_pct: number
  suggested_price: number
  cost_per_yield: number
  suggested_price_per_yield: number
}

export interface ProductRecipeInput {
  recipe_id: string
  quantity: number
}

export interface ProductItemInput {
  ingredient_id: string
  quantity: number
  unit: string
}

export interface ProductInput {
  name: string
  description?: string
  yield: number
  yield_unit: string
  invisible_cost_pct: number
  profit_multiplier: number
  recipes: ProductRecipeInput[]
  ingredients?: ProductItemInput[]
  insumos?: ProductItemInput[]
}

interface PaginatedResult<T> {
  items: T[]
  meta: { current_page: number; last_page: number; total: number }
}

export const ProductService = {
  async getPaginated(page = 1, search = ''): Promise<PaginatedResult<Product>> {
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('search', search)
    const res = await api.get<{ data: { data: Product[]; current_page: number; last_page: number; total: number } }>(`/products?${params}`)
    const p = res.data
    return { items: p.data, meta: { current_page: p.current_page, last_page: p.last_page, total: p.total } }
  },

  async getById(id: string): Promise<Product> {
    const res = await api.get<{ data: Product }>(`/products/${id}`)
    return res.data
  },

  async create(data: ProductInput): Promise<Product> {
    const res = await api.post<{ data: Product }>('/products', data)
    return res.data
  },

  async update(id: string, data: Partial<ProductInput>): Promise<Product> {
    const res = await api.put<{ data: Product }>(`/products/${id}`, data)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/products/${id}`)
  },

  async fromRecipe(recipeId: string): Promise<Product> {
    const res = await api.post<{ data: Product }>(`/recipes/${recipeId}/to-product`, {})
    return res.data
  },
}
