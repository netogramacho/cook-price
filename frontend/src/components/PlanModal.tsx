import { useState, useEffect, useRef } from 'react'
import { SubscriptionService, type SubscriptionData } from '../services/SubscriptionService'
import { PlanService } from '../services/PlanService'
import { UserService } from '../services/UserService'
import { useAppStore } from '../store/useAppStore'
import { getUser, setUser, type UserPlan } from '../lib/auth'

const FEATURE_MAP: { key: keyof UserPlan; label: string }[] = [
  { key: 'has_stock',         label: 'Controle de estoque' },
  { key: 'has_stock_history', label: 'Histórico de movimentos' },
  { key: 'has_production',    label: 'Controle de produção' },
]

function buildFeatures(plan: UserPlan): string[] {
  const features: string[] = []

  if (plan.max_recipes === null) {
    features.push('Receitas ilimitadas')
  } else {
    features.push(`Até ${plan.max_recipes} receitas`)
  }

  if (plan.max_ingredients === null) {
    features.push('Ingredientes ilimitados')
  } else {
    features.push(`Até ${plan.max_ingredients} ingredientes`)
  }

  if (plan.has_pricing) {
    features.push('Precificação e lucro')
  } else {
    features.push('Custo básico das receitas')
  }

  for (const { key, label } of FEATURE_MAP) {
    if (plan[key]) features.push(label)
  }

  return features
}

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 10

interface Props {
  visible: boolean
  onClose: () => void
  message?: string | null
}

export function PlanModal({ visible, onClose, message }: Props) {
  const { success, error } = useAppStore()

  const [plans, setPlans] = useState<UserPlan[]>([])
  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(getUser()?.plan ?? null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [upgradingTo, setUpgradingTo] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [isClosing, setIsClosing] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollAttemptsRef = useRef(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    pollAttemptsRef.current = 0
  }

  async function refreshSubscription() {
    const data = await SubscriptionService.current()
    setCurrentPlan(data.plan)
    setSubscription(data.subscription)
    const user = getUser()
    if (user) setUser({ ...user, plan: data.plan })
    return data
  }

  useEffect(() => {
    if (!visible) {
      stopPolling()
      return
    }

    setLoadingPlan(true)
    Promise.all([
      PlanService.getAll(),
      refreshSubscription(),
    ])
      .then(([fetchedPlans]) => setPlans(fetchedPlans))
      .catch(() => error('Erro ao carregar dados do plano.'))
      .finally(() => setLoadingPlan(false))

    return () => stopPolling()
  }, [visible])

  useEffect(() => {
    if (!visible || subscription?.mp_status !== 'pending') {
      stopPolling()
      return
    }

    pollAttemptsRef.current = 0
    pollRef.current = setInterval(async () => {
      pollAttemptsRef.current++

      try {
        const data = await refreshSubscription()

        if (data.subscription?.mp_status === 'authorized') {
          stopPolling()
          success('Assinatura confirmada! Seu plano foi ativado.')
          return
        }

        if (pollAttemptsRef.current >= POLL_MAX_ATTEMPTS) {
          stopPolling()
          error('Não foi possível confirmar o pagamento. Se o problema persistir, entre em contato.')
        }
      } catch {
        stopPolling()
      }
    }, POLL_INTERVAL_MS)

    return () => stopPolling()
  }, [visible, subscription?.mp_status])

  useEffect(() => {
    if (!confirmCancel) {
      if (countdownRef.current) clearInterval(countdownRef.current)
      setCountdown(5)
      return
    }

    setCountdown(5)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [confirmCancel])

  async function handleUpgrade(planName: string) {
    setUpgradingTo(planName)
    try {
      const { checkout_url } = await SubscriptionService.subscribe(planName as 'basic' | 'pro')
      window.location.href = checkout_url
    } catch (err) {
      const e = err as { message?: string }
      error(e.message ?? 'Erro ao iniciar checkout.')
      setUpgradingTo(null)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      const result = await SubscriptionService.cancel()
      const user = await UserService.get()
      setUser(user)
      setCurrentPlan(user.plan)
      await refreshSubscription()
      setConfirmCancel(false)

      const endsAt = result.ends_at
        ? new Date(result.ends_at).toLocaleDateString('pt-BR')
        : null

      success(
        endsAt
          ? `Assinatura cancelada. Você ainda tem acesso até ${endsAt}.`
          : 'Assinatura cancelada. Plano revertido para Gratuito.'
      )
    } catch (err) {
      const e = err as { message?: string }
      error(e.message ?? 'Erro ao cancelar assinatura.')
    } finally {
      setCancelling(false)
    }
  }

  function handleClose() {
    setIsClosing(true)
    setTimeout(() => {
      setIsClosing(false)
      onClose()
    }, 220)
  }

  const pendingOrPaused    = subscription?.mp_status === 'pending' || subscription?.mp_status === 'paused'
  const cancelledWithAccess = subscription?.mp_status === 'cancelled' && !!subscription?.cancel_at_period_end

  if (!visible && !isClosing) return null

  return (
    <div className={`plan-drawer-overlay${isClosing ? ' plan-drawer-overlay--closing' : ''}`} onClick={handleClose}>
      <div className={`plan-drawer${isClosing ? ' plan-drawer--closing' : ''}`} onClick={e => e.stopPropagation()}>
        <div className="plan-drawer-header">
          <h3>Meu Plano</h3>
          <button className="plan-drawer-close" onClick={handleClose}>&times;</button>
        </div>
        <div className="plan-drawer-body">
          {message && (
            <div className="plan-limit-message">{message}</div>
          )}
          {loadingPlan ? (
            <p className="plan-loading">Carregando...</p>
          ) : (
            <>
              {subscription?.mp_status === 'pending' && (
                <div className="plan-status-alert plan-status-pending">
                  Aguardando confirmação do pagamento...
                </div>
              )}
              {subscription?.mp_status === 'paused' && (
                <div className="plan-status-alert plan-status-paused">
                  Assinatura pausada. Seu acesso permanece até{' '}
                  {subscription.ends_at ? new Date(subscription.ends_at).toLocaleDateString('pt-BR') : '—'}.
                </div>
              )}
              {cancelledWithAccess && (
                <div className="plan-status-alert plan-status-paused">
                  Assinatura cancelada. Você ainda tem acesso ao plano até{' '}
                  {subscription.ends_at ? new Date(subscription.ends_at).toLocaleDateString('pt-BR') : '—'}.
                </div>
              )}

              <div className="plan-cards">
                {plans.map(plan => {
                  const isCurrent   = currentPlan?.name === plan.name
                  const isUpgrading = upgradingTo === plan.name
                  const canUpgrade  = plan.name !== 'free' && !isCurrent && !pendingOrPaused && !cancelledWithAccess
                  const features    = buildFeatures(plan)

                  return (
                    <div key={plan.name} className={`plan-card${isCurrent ? ' plan-card--current' : ''}`}>
                      <div className="plan-card-header">
                        <span className="plan-card-name">{plan.label}</span>
                        <span className="plan-card-price">
                          {Number(plan.price) === 0 ? 'Grátis' : `R$ ${Number(plan.price).toFixed(0)}/mês`}
                        </span>
                      </div>
                      <ul className="plan-features">
                        {features.map(f => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                      <div className="plan-card-action">
                        {isCurrent ? (
                          <span className="plan-badge-current">Plano atual</span>
                        ) : canUpgrade ? (
                          <button
                            className="btn btn-primary btn-sm btn-full"
                            disabled={!!upgradingTo}
                            onClick={() => handleUpgrade(plan.name)}
                          >
                            {isUpgrading ? 'Redirecionando...' : 'Fazer Upgrade'}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              {subscription?.mp_status === 'authorized' && (
                <div className="plan-cancel-section">
                  {confirmCancel ? (
                    <div className="plan-cancel-confirm">
                      <p>
                        Tem certeza? Você ainda terá acesso ao plano até o fim do período atual
                        {subscription.current_period_end
                          ? ` (${new Date(subscription.current_period_end).toLocaleDateString('pt-BR')})`
                          : ''
                        }.
                      </p>
                      <div className="plan-cancel-confirm-actions">
                        <button className="btn btn-secondary btn-sm" disabled={cancelling} onClick={() => setConfirmCancel(false)}>
                          Voltar
                        </button>
                        <button className="btn btn-danger btn-sm" disabled={cancelling || countdown > 0} onClick={handleCancel}>
                          {cancelling ? 'Cancelando...' : countdown > 0 ? `Confirmar cancelamento (${countdown})` : 'Confirmar cancelamento'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="plan-cancel-link" onClick={() => setConfirmCancel(true)}>
                      Cancelar assinatura
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
