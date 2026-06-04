import { api } from '../lib/api'
import { setAuth, logout as authLogout } from '../lib/auth'
import type { AuthUser } from '../lib/auth'

interface LoginResponse {
  success: boolean
  data: { token: string; user: AuthUser }
}

export const AuthService = {
  async login(credentials: { email: string; password: string }): Promise<void> {
    const res = await api.post<LoginResponse>('/auth/login', credentials)
    setAuth(res.data.token, res.data.user)
  },

  async register(data: { name: string; email: string; password: string; password_confirmation: string }): Promise<void> {
    const res = await api.post<LoginResponse>('/auth/register', data)
    setAuth(res.data.token, res.data.user)
  },

  async logout(): Promise<void> {
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    authLogout()
  },
}
