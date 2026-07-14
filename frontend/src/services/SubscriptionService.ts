import { api } from '../lib/api'
import type { UserPlan } from '../lib/auth'

export interface SubscriptionData {
  id: string
  mp_status: 'pending' | 'authorized' | 'paused' | 'cancelled'
  starts_at: string | null
  ends_at: string | null
  cancel_at_period_end: boolean
  plan: UserPlan
}

export interface CurrentSubscription {
  plan: UserPlan
  subscription: SubscriptionData | null
}

export interface CancelResult {
  ends_at: string | null
}

export const SubscriptionService = {
  // Assinatura vigente (governa o acesso) — nunca uma pending.
  current(): Promise<CurrentSubscription> {
    return api.get<{ data: CurrentSubscription }>('/subscriptions/current').then(r => r.data)
  },

  // Checkout em andamento (pending), ou null. Usado no polling "aguardando pagamento".
  currentPending(): Promise<SubscriptionData | null> {
    return api
      .get<{ data: { subscription: SubscriptionData | null } }>('/subscriptions/current/pending')
      .then(r => r.data.subscription)
  },

  subscribe(plan: 'basic' | 'pro'): Promise<{ checkout_url: string }> {
    return api.post<{ data: { checkout_url: string } }>('/subscriptions', { plan }).then(r => r.data)
  },

  cancel(): Promise<CancelResult> {
    return api.delete<{ data: CancelResult }>('/subscriptions').then(r => r.data)
  },
}
