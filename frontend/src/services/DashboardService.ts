import { api } from '../lib/api'

export interface DashboardData {
  recipes_count: number
  ingredients_count: number
  productions_count: number
}

export const DashboardService = {
  async get(): Promise<DashboardData> {
    const res = await api.get<{ data: DashboardData }>('/dashboard')
    return res.data
  },
}
