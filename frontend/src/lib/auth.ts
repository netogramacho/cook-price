const TOKEN_KEY = 'token'
const USER_KEY = 'user'

export interface UserPlan {
  id: string
  name: 'free' | 'basic' | 'pro'
  label: string
  price: string
  max_recipes: number | null
  max_ingredients: number | null
  has_pricing: boolean
  has_production: boolean
}

export interface AuthUser {
  id: string
  name: string
  email: string
  email_verified_at: string | null
  plan: UserPlan
  profit_multiplier?: number
  invisible_cost_pct?: number
  disable_stock_control?: boolean
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function getUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function setAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function setUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function logout(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function isEmailVerified(): boolean {
  return !!getUser()?.email_verified_at
}
