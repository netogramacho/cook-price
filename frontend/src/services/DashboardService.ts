import { api } from '../lib/api'

export interface DashboardData {
  recipes_count: number
  ingredients_count: number
  low_stock_count: number
  recent_recipes: { id: string; name: string; sale_price: number }[]
}

export const DashboardService = {
  async get(): Promise<DashboardData> {
    const res = await api.get<{ data: DashboardData }>('/dashboard')
    return res.data
  },
}
