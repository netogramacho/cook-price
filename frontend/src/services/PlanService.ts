import { api } from '../lib/api'
import type { UserPlan } from '../lib/auth'

export const PlanService = {
  getAll(): Promise<UserPlan[]> {
    return api.get<{ data: UserPlan[] }>('/plans').then(r => r.data)
  },
}
