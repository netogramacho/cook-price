import { useState, useEffect, useRef } from 'react'
import { SubscriptionService, type SubscriptionData } from '../services/SubscriptionService'
import { UserService } from '../services/UserService'
import { useAppStore } from '../store/useAppStore'
import { getUser, setUser } from '../lib/auth'
import type { UserPlan } from '../lib/auth'

interface PlanDef {
  name: 'free' | 'basic' | 'pro'
  label: string
  price: string
  features: string[]
}

const PLANS: PlanDef[] = [
  {
    name: 'free',
    label: 'Gratuito',
    price: 'R$ 0/mês',
    features: ['Até 3 receitas', 'Até 15 ingredientes', 'Custo básico das receitas'],
  },
  {
    name: 'basic',
    label: 'Básico',
    price: 'R$ 19/mês',
    features: ['Até 15 receitas', 'Até 60 ingredientes', 'Precificação e lucro', 'Controle de estoque', 'Registro de compras'],
  },
  {
    name: 'pro',
    label: 'Pro',
    price: 'R$ 39/mês',
    features: ['Receitas ilimitadas', 'Ingredientes ilimitados', 'Tudo do Básico', 'Histórico de movimentos', 'Controle de produção'],
  },
]

const POLL_INTERVAL_MS = 3000
const POLL_MAX_ATTEMPTS = 10

interface Props {
  visible: boolean
  onClose: () => void
  message?: string | null
}

export function PlanModal({ visible, onClose, message }: Props) {
  const { success, error } = useAppStore()

  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(getUser()?.plan ?? null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [upgradingTo, setUpgradingTo] = useState<'basic' | 'pro' | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollAttemptsRef = useRef(0)

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
    refreshSubscription()
      .catch(() => error('Erro ao carregar dados do plano.'))
      .finally(() => setLoadingPlan(false))

    return () => stopPolling()
  }, [visible])

  // Inicia polling automático quando status é pending
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

  async function handleUpgrade(plan: 'basic' | 'pro') {
    setUpgradingTo(plan)
    try {
      const { checkout_url } = await SubscriptionService.subscribe(plan)
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

  const pendingOrPaused = subscription?.mp_status === 'pending' || subscription?.mp_status === 'paused'
  const cancelledWithAccess = subscription?.mp_status === 'cancelled' && subscription?.cancel_at_period_end

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
            <div className="plan-limit-message">
              {message}
            </div>
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
                {PLANS.map(plan => {
                  const isCurrent = currentPlan?.name === plan.name
                  const isUpgrading = upgradingTo === plan.name
                  const canUpgrade = plan.name !== 'free' && !isCurrent && !pendingOrPaused && !cancelledWithAccess

                  return (
                    <div key={plan.name} className={`plan-card${isCurrent ? ' plan-card--current' : ''}`}>
                      <div className="plan-card-header">
                        <span className="plan-card-name">{plan.label}</span>
                        <span className="plan-card-price">{plan.price}</span>
                      </div>
                      <ul className="plan-features">
                        {plan.features.map(f => (
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
                            onClick={() => handleUpgrade(plan.name as 'basic' | 'pro')}
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
                        <button className="btn btn-danger btn-sm" disabled={cancelling} onClick={handleCancel}>
                          {cancelling ? 'Cancelando...' : 'Confirmar cancelamento'}
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
