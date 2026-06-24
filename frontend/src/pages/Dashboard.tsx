import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AsyncState } from '../components/ui/AsyncState'
import { DashboardService } from '../services/DashboardService'
import type { DashboardData } from '../services/DashboardService'
import { OnboardingService } from '../services/OnboardingService'
import type { OnboardingState } from '../services/OnboardingService'
import { getUser } from '../lib/auth'
import { triggerPlanUpgrade } from '../lib/api'

type StepFeature = 'has_production' | 'has_products' | null

interface OnboardingStepDef {
  key: 'created_ingredient' | 'created_insumo' | 'created_recipe' | 'created_product' | 'registered_production'
  label: string
  route: string
  requiresFeature: StepFeature
  badge?: string
  lockedMsg?: string
}

const ONBOARDING_STEPS: OnboardingStepDef[] = [
  { key: 'created_ingredient',    label: 'Cadastre um ingrediente',   route: '/ingredients?hint=ingredient', requiresFeature: null },
  { key: 'created_recipe',        label: 'Crie sua primeira receita',  route: '/recipes?hint=recipe',         requiresFeature: null },
  { key: 'created_insumo',        label: 'Cadastre um insumo',        route: '/insumos?hint=insumo',         requiresFeature: null },
  { key: 'created_product',       label: 'Cadastre um produto',       route: '/produtos?hint=product',       requiresFeature: 'has_products',  badge: 'Básico', lockedMsg: 'O cadastro de produtos está disponível nos planos pagos.' },
  { key: 'registered_production', label: 'Registre uma produção',      route: '/produtos?hint=production',     requiresFeature: 'has_production', badge: 'Pro',    lockedMsg: 'O histórico de produções está disponível nos planos pagos.' },
]

export function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardData | null>(null)
  const [onboarding, setOnboarding] = useState<OnboardingState | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const user = getUser()
  const hasProd = !!user?.plan.has_production
  const hasProducts = !!user?.plan.has_products

  function hasFeature(feature: StepFeature): boolean {
    if (!feature) return true
    return !!(user?.plan as Record<string, boolean | string | null> | undefined)?.[feature]
  }

  useEffect(() => {
    Promise.all([DashboardService.get(), OnboardingService.get()])
      .then(([dashboard, onboardingState]) => {
        setStats(dashboard)
        setOnboarding(onboardingState)
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  function dismissOnboarding() {
    setOnboarding(prev => (prev ? { ...prev, dismissed: true } : prev))
    OnboardingService.dismiss().catch(() => {})
  }

  // Passos disponíveis para o plano do usuário (os bloqueados não contam p/ visibilidade)
  const availableSteps = ONBOARDING_STEPS.filter(s => hasFeature(s.requiresFeature))
  const hasAvailableIncomplete = !!onboarding && availableSteps.some(s => !onboarding[s.key])
  const showOnboarding = !!onboarding && !onboarding.dismissed && hasAvailableIncomplete

  // Índice do primeiro passo disponível ainda não concluído — passos seguintes ficam "waiting"
  const firstIncompleteIdx = onboarding
    ? availableSteps.findIndex(s => !onboarding[s.key])
    : -1

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <div className="dashboard-stats">
            <Link to="/ingredients" className="stat-card stat-card-link">
              <p className="stat-card-label">Ingredientes</p>
              <p className="stat-card-value">{stats ? stats.ingredients_count : '—'}</p>
              {stats?.ingredients_count === 0 && <p className="stat-card-hint">Cadastre seu primeiro ingrediente →</p>}
            </Link>
            <Link to="/insumos" className="stat-card stat-card-link">
              <p className="stat-card-label">Insumos</p>
              <p className="stat-card-value">{stats ? stats.insumos_count : '—'}</p>
              {stats?.insumos_count === 0 && <p className="stat-card-hint">Cadastre embalagens e finalização →</p>}
            </Link>
            <Link to="/recipes" className="stat-card stat-card-link">
              <p className="stat-card-label">Receitas</p>
              <p className="stat-card-value">{stats ? stats.recipes_count : '—'}</p>
              {stats?.recipes_count === 0 && <p className="stat-card-hint">Crie sua primeira receita →</p>}
            </Link>
            {hasProducts && (
              <Link to="/produtos" className="stat-card stat-card-link stat-card-feature">
                <p className="stat-card-label">Produtos</p>
                <p className="stat-card-value">{stats?.products_count != null ? stats.products_count : '—'}</p>
                {stats?.products_count === 0 && <p className="stat-card-hint">Monte seu primeiro produto →</p>}
              </Link>
            )}
            {hasProd && (
              <Link to="/producoes" className="stat-card stat-card-link">
                <p className="stat-card-label">Lotes</p>
                <p className="stat-card-value">{stats?.productions_count != null ? stats.productions_count : '—'}</p>
                {stats?.productions_count === 0 && <p className="stat-card-hint">Registre sua primeira produção →</p>}
              </Link>
            )}
          </div>

          <AsyncState loading={loading} error={loadError ? 'Erro ao carregar dashboard.' : null} empty={false}>
            {showOnboarding && onboarding && (
              <div className="onboarding-checklist">
                <h3 className="onboarding-title">Primeiros passos</h3>
                <div className="onboarding-steps">
                  {ONBOARDING_STEPS.map(step => {
                    const available = hasFeature(step.requiresFeature)

                    if (!available) {
                      return (
                        <div
                          key={step.key}
                          className="onboarding-step onboarding-step--locked"
                          onClick={() => triggerPlanUpgrade(step.lockedMsg)}
                        >
                          <span className="onboarding-step-icon">🔒</span>
                          <span className="onboarding-step-label">
                            {step.label}
                            {step.badge && <span className="onboarding-step-badge">{step.badge}</span>}
                          </span>
                        </div>
                      )
                    }

                    const done = onboarding[step.key]
                    const availableIdx = availableSteps.findIndex(s => s.key === step.key)
                    const waiting = !done && firstIncompleteIdx !== -1 && availableIdx > firstIncompleteIdx
                    const position = availableIdx + 1

                    return (
                      <div
                        key={step.key}
                        className={`onboarding-step${done ? ' onboarding-step--done' : waiting ? ' onboarding-step--waiting' : ''}`}
                        onClick={() => !done && !waiting && navigate(step.route)}
                      >
                        <span className="onboarding-step-icon">{done ? '✓' : position}</span>
                        <span className="onboarding-step-label">{step.label}</span>
                      </div>
                    )
                  })}
                </div>
                <button className="onboarding-dismiss" onClick={dismissOnboarding}>Não ver novamente</button>
              </div>
            )}
          </AsyncState>
        </div>
      </main>
    </div>
  )
}
