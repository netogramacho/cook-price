const TOKEN_KEY = 'token'
const USER_KEY = 'user'
// Sessão do admin preservada enquanto ele acessa como outro usuário (impersonation).
const IMPERSONATOR_TOKEN_KEY = 'impersonator_token'
const IMPERSONATOR_USER_KEY = 'impersonator_user'

export interface UserPlan {
  id: string
  name: 'free' | 'basic' | 'pro' | 'trial'
  label: string
  price: string
  max_recipes: number | null
  max_products: number | null
  max_ingredients: number | null
  has_pricing: boolean
  has_production: boolean
  has_products: boolean
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
  is_admin?: boolean
}

export function isAdmin(): boolean {
  return !!getUser()?.is_admin
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
  localStorage.removeItem(IMPERSONATOR_TOKEN_KEY)
  localStorage.removeItem(IMPERSONATOR_USER_KEY)
}

export function isAuthenticated(): boolean {
  return !!getToken()
}

export function isEmailVerified(): boolean {
  return !!getUser()?.email_verified_at
}

export function isImpersonating(): boolean {
  return !!localStorage.getItem(IMPERSONATOR_TOKEN_KEY)
}

// Inicia a impersonation: guarda a sessão atual (admin) e ativa a do alvo.
export function startImpersonation(targetToken: string, targetUser: AuthUser): void {
  if (isImpersonating()) return // evita aninhar / sobrescrever a sessão do admin
  const token = getToken()
  const userRaw = localStorage.getItem(USER_KEY)
  if (token) localStorage.setItem(IMPERSONATOR_TOKEN_KEY, token)
  if (userRaw) localStorage.setItem(IMPERSONATOR_USER_KEY, userRaw)
  setAuth(targetToken, targetUser)
}

// Encerra a impersonation restaurando a sessão do admin.
export function stopImpersonation(): void {
  const token = localStorage.getItem(IMPERSONATOR_TOKEN_KEY)
  const userRaw = localStorage.getItem(IMPERSONATOR_USER_KEY)
  if (token && userRaw) {
    localStorage.setItem(TOKEN_KEY, token)
    localStorage.setItem(USER_KEY, userRaw)
  }
  localStorage.removeItem(IMPERSONATOR_TOKEN_KEY)
  localStorage.removeItem(IMPERSONATOR_USER_KEY)
}
