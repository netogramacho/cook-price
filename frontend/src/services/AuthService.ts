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

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email })
  },

  async resetPassword(data: { token: string; email: string; password: string; password_confirmation: string }): Promise<void> {
    await api.post('/auth/reset-password', data)
  },

  async resendVerification(): Promise<void> {
    await api.post('/auth/email/resend')
  },
}
