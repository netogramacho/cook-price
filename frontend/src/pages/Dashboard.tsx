import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AsyncState } from '../components/ui/AsyncState'
import { DashboardService } from '../services/DashboardService'
import type { DashboardData } from '../services/DashboardService'
import { getUser } from '../lib/auth'
import { triggerPlanUpgrade } from '../lib/api'

export function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const hasProd = !!getUser()?.plan.has_production

  useEffect(() => {
    DashboardService.get()
      .then(data => setStats(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  const step1Done = !!stats && stats.ingredients_count > 0
  const step2Done = !!stats && stats.recipes_count > 0
  const step3Done = !!stats && (stats.productions_count ?? 0) > 0

  const allDone = stats
    ? step1Done && step2Done && (!hasProd || step3Done)
    : true

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
            <Link to="/recipes" className="stat-card stat-card-link">
              <p className="stat-card-label">Receitas</p>
              <p className="stat-card-value">{stats ? stats.recipes_count : '—'}</p>
              {stats?.recipes_count === 0 && <p className="stat-card-hint">Crie sua primeira receita →</p>}
            </Link>
            {hasProd && (
              <Link to="/producoes" className="stat-card stat-card-link">
                <p className="stat-card-label">Produções</p>
                <p className="stat-card-value">{stats?.productions_count != null ? stats.productions_count : '—'}</p>
                {stats?.productions_count === 0 && <p className="stat-card-hint">Registre sua primeira produção →</p>}
              </Link>
            )}
          </div>

          <AsyncState loading={loading} error={loadError ? 'Erro ao carregar dashboard.' : null} empty={false}>
            {stats && !allDone && (
              <div className="onboarding-checklist">
                <h3 className="onboarding-title">Primeiros passos</h3>
                <div className="onboarding-steps">

                  <div
                    className={`onboarding-step${step1Done ? ' onboarding-step--done' : ''}`}
                    onClick={() => !step1Done && navigate('/ingredients?hint=ingredient')}
                  >
                    <span className="onboarding-step-icon">{step1Done ? '✓' : '1'}</span>
                    <span className="onboarding-step-label">Cadastre um ingrediente</span>
                  </div>

                  <div
                    className={`onboarding-step${step2Done ? ' onboarding-step--done' : !step1Done ? ' onboarding-step--waiting' : ''}`}
                    onClick={() => step1Done && !step2Done && navigate('/recipes?hint=recipe')}
                  >
                    <span className="onboarding-step-icon">{step2Done ? '✓' : '2'}</span>
                    <span className="onboarding-step-label">Crie sua primeira receita</span>
                  </div>

                  {hasProd ? (
                    <div
                      className={`onboarding-step${step3Done ? ' onboarding-step--done' : !step2Done ? ' onboarding-step--waiting' : ''}`}
                      onClick={() => step2Done && !step3Done && navigate('/recipes?hint=production')}
                    >
                      <span className="onboarding-step-icon">{step3Done ? '✓' : '3'}</span>
                      <span className="onboarding-step-label">Registre uma produção</span>
                    </div>
                  ) : (
                    <div
                      className="onboarding-step onboarding-step--locked"
                      onClick={() => triggerPlanUpgrade('O módulo de produções está disponível nos planos pagos.')}
                    >
                      <span className="onboarding-step-icon">🔒</span>
                      <span className="onboarding-step-label">Registre uma produção <span className="onboarding-step-badge">Basic</span></span>
                    </div>
                  )}

                </div>
              </div>
            )}
          </AsyncState>
        </div>
      </main>
    </div>
  )
}
