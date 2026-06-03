import { api } from '../lib/api'
import type { AuthUser } from '../lib/auth'

export const UserService = {
  get(): Promise<AuthUser> {
    return api.get<{ data: AuthUser }>('/user').then(r => r.data)
  },

  updateSettings(data: { profit_multiplier?: number }): Promise<AuthUser> {
    return api.put<{ data: AuthUser }>('/user/settings', data).then(r => r.data)
  },

  changePassword(data: { current_password: string; password: string; password_confirmation: string }): Promise<void> {
    return api.put<void>('/user/password', data)
  },
}
