import { api } from '../lib/api'
import type { UserPlan } from '../lib/auth'

export type PlanName = 'free' | 'basic' | 'pro' | 'trial'
export type MpStatus = 'pending' | 'authorized' | 'paused' | 'cancelled'

export interface AdminUserListItem {
  id: string
  name: string
  email: string
  phone: string | null
  email_verified_at: string | null
  is_admin: boolean
  created_at: string
  plan: UserPlan | null
}

export interface AdminSubscription {
  id: string
  mp_status: MpStatus
  mp_preapproval_id: string | null
  starts_at: string | null
  ends_at: string | null
  cancel_at_period_end: boolean
  created_at: string
  updated_at: string
  plan: UserPlan | null
}

export interface AdminUserDetail {
  user: {
    id: string
    name: string
    email: string
    phone: string | null
    email_verified_at: string | null
    is_admin: boolean
    created_at: string
    plan: UserPlan | null
  }
  counts: {
    ingredients: number
    insumos: number
    recipes: number
    products: number
    productions: number
  }
  subscriptions: AdminSubscription[]
}

export interface MpPreapproval {
  id: string
  status: MpStatus | null
  reason: string | null
  payer_email: string | null
  amount: number | null
  currency_id: string | null
  date_created: string | null
  next_payment_date: string | null
  local_user: { id: string; name: string; email: string } | null
}

export interface MpSubscriptionsResult {
  items: MpPreapproval[]
  paging: { total: number; limit: number; offset: number }
}

export interface IntegrationLog {
  id: string
  service: string
  direction: string
  type: string | null
  status_code: number | null
  success: boolean
  error_message: string | null
  payload: unknown
  response: unknown
  created_at: string
}

interface PaginatedResult<T> {
  items: T[]
  meta: { current_page: number; last_page: number; total: number }
}

// A API devolve o paginator do Laravel direto em `data` (data[], current_page, ...).
function toPaginated<T>(p: { data: T[]; current_page: number; last_page: number; total: number }): PaginatedResult<T> {
  return { items: p.data, meta: { current_page: p.current_page, last_page: p.last_page, total: p.total } }
}

export const AdminService = {
  async listUsers(page = 1, search = ''): Promise<PaginatedResult<AdminUserListItem>> {
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('search', search)
    const res = await api.get<{ data: { data: AdminUserListItem[]; current_page: number; last_page: number; total: number } }>(`/admin/users?${params}`)
    return toPaginated(res.data)
  },

  async getUser(id: string): Promise<AdminUserDetail> {
    const res = await api.get<{ data: AdminUserDetail }>(`/admin/users/${id}`)
    return res.data
  },

  updatePlan(id: string, plan: PlanName): Promise<void> {
    return api.post(`/admin/users/${id}/plan`, { plan })
  },

  resendVerification(id: string): Promise<void> {
    return api.post(`/admin/users/${id}/resend-verification`)
  },

  verifyEmail(id: string): Promise<void> {
    return api.post(`/admin/users/${id}/verify-email`)
  },

  sendPasswordReset(id: string): Promise<void> {
    return api.post(`/admin/users/${id}/send-password-reset`)
  },

  cancelSubscription(id: string): Promise<void> {
    return api.post(`/admin/subscriptions/${id}/cancel`)
  },

  syncSubscription(id: string): Promise<{ mp_status: MpStatus | null; subscription: AdminSubscription }> {
    return api.post<{ data: { mp_status: MpStatus | null; subscription: AdminSubscription } }>(`/admin/subscriptions/${id}/sync`).then(r => r.data)
  },

  async listMpSubscriptions(status = 'authorized', limit = 50, offset = 0): Promise<MpSubscriptionsResult> {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
    if (status) params.set('status', status)
    const res = await api.get<{ data: MpSubscriptionsResult }>(`/admin/mp/subscriptions?${params}`)
    return res.data
  },

  async listLogs(page = 1, status = ''): Promise<PaginatedResult<IntegrationLog>> {
    const params = new URLSearchParams({ page: String(page) })
    if (status) params.set('status', status)
    const res = await api.get<{ data: { data: IntegrationLog[]; current_page: number; last_page: number; total: number } }>(`/admin/integration-logs?${params}`)
    return toPaginated(res.data)
  },
}
