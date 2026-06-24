import { api } from '../lib/api'

export interface OnboardingState {
  created_ingredient: boolean
  created_insumo: boolean
  created_recipe: boolean
  created_product: boolean
  registered_production: boolean
  dismissed: boolean
}

export const OnboardingService = {
  async get(): Promise<OnboardingState> {
    const res = await api.get<{ data: OnboardingState }>('/onboarding')
    return res.data
  },

  async dismiss(): Promise<OnboardingState> {
    const res = await api.post<{ data: OnboardingState }>('/onboarding/dismiss')
    return res.data
  },
}
