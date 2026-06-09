import { useState, useEffect } from 'react'
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

interface Props {
  visible: boolean
  onClose: () => void
}

export function PlanModal({ visible, onClose }: Props) {
  const { success, error } = useAppStore()

  const [currentPlan, setCurrentPlan] = useState<UserPlan | null>(getUser()?.plan ?? null)
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [upgradingTo, setUpgradingTo] = useState<'basic' | 'pro' | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)

  useEffect(() => {
    if (!visible) return

    setLoadingPlan(true)
    SubscriptionService.current()
      .then(data => {
        setCurrentPlan(data.plan)
        setSubscription(data.subscription)
        // Atualiza localStorage com o plano mais recente
        const user = getUser()
        if (user) setUser({ ...user, plan: data.plan })
      })
      .catch(() => error('Erro ao carregar dados do plano.'))
      .finally(() => setLoadingPlan(false))
  }, [visible])

  async function handleUpgrade(plan: 'basic' | 'pro') {
    setUpgradingTo(plan)
    try {
      const { checkout_url } = await SubscriptionService.subscribe(plan)
      window.location.href = checkout_url
    } catch (err) {
      const e = err as { message?: string; error_code?: string }
      error(e.message ?? 'Erro ao iniciar checkout.')
      setUpgradingTo(null)
    }
  }

  async function handleCancel() {
    setCancelling(true)
    try {
      await SubscriptionService.cancel()
      const user = await UserService.get()
      setUser(user)
      setCurrentPlan(user.plan)
      setSubscription(null)
      setConfirmCancel(false)
      success('Assinatura cancelada. Plano revertido para Gratuito.')
    } catch (err) {
      const e = err as { message?: string }
      error(e.message ?? 'Erro ao cancelar assinatura.')
    } finally {
      setCancelling(false)
    }
  }

  const pendingOrPaused = subscription?.mp_status === 'pending' || subscription?.mp_status === 'paused'

  if (!visible) return null

  return (
    <div className="plan-drawer-overlay" onClick={onClose}>
      <div className="plan-drawer" onClick={e => e.stopPropagation()}>
        <div className="plan-drawer-header">
          <h3>Meu Plano</h3>
          <button className="plan-drawer-close" onClick={onClose}>&times;</button>
        </div>
        <div className="plan-drawer-body">
          {loadingPlan ? (
            <p className="plan-loading">Carregando...</p>
          ) : (
            <>
              {subscription?.mp_status === 'pending' && (
                <div className="plan-status-alert plan-status-pending">
                  Pagamento em análise. Aguarde a confirmação do MercadoPago.
                </div>
              )}
              {subscription?.mp_status === 'paused' && (
                <div className="plan-status-alert plan-status-paused">
                  Assinatura pausada. Seu acesso permanece até{' '}
                  {subscription.ends_at ? new Date(subscription.ends_at).toLocaleDateString('pt-BR') : '—'}.
                </div>
              )}

              <div className="plan-cards">
                {PLANS.map(plan => {
                  const isCurrent = currentPlan?.name === plan.name
                  const isUpgrading = upgradingTo === plan.name
                  const canUpgrade = plan.name !== 'free' && !isCurrent && !pendingOrPaused

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
                      <p>Tem certeza? Seu plano voltará para Gratuito imediatamente.</p>
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
