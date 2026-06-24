import { api } from '../lib/api'

export interface DashboardData {
  ingredients_count: number
  insumos_count: number
  recipes_count: number
  products_count: number | null
  productions_count: number | null
}

export const DashboardService = {
  async get(): Promise<DashboardData> {
    const res = await api.get<{ data: DashboardData }>('/dashboard')
    return res.data
  },
}
