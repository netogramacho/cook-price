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

  const allDone = stats
    ? stats.ingredients_count > 0 && stats.recipes_count > 0 && (hasProd ? stats.productions_count > 0 : true)
    : true

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <AsyncState loading={loading} error={loadError ? 'Erro ao carregar dashboard.' : null} empty={false}>
            {stats && (
              <>
                {!allDone && (
                  <div className="onboarding-checklist">
                    <h3 className="onboarding-title">Primeiros passos</h3>
                    <div className="onboarding-steps">

                      <div
                        className={`onboarding-step${stats.ingredients_count > 0 ? ' onboarding-step--done' : ''}`}
                        onClick={() => stats.ingredients_count === 0 && navigate('/ingredients')}
                      >
                        <span className="onboarding-step-icon">{stats.ingredients_count > 0 ? '✓' : '1'}</span>
                        <span className="onboarding-step-label">Cadastre um ingrediente</span>
                      </div>

                      <div
                        className={`onboarding-step${stats.recipes_count > 0 ? ' onboarding-step--done' : ''}`}
                        onClick={() => stats.recipes_count === 0 && navigate('/recipes')}
                      >
                        <span className="onboarding-step-icon">{stats.recipes_count > 0 ? '✓' : '2'}</span>
                        <span className="onboarding-step-label">Crie sua primeira receita</span>
                      </div>

                      {hasProd ? (
                        <div
                          className={`onboarding-step${stats.productions_count > 0 ? ' onboarding-step--done' : ''}`}
                          onClick={() => stats.productions_count === 0 && navigate('/recipes')}
                        >
                          <span className="onboarding-step-icon">{stats.productions_count > 0 ? '✓' : '3'}</span>
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

                <div className="dashboard-stats">
                  <Link to="/ingredients" className="stat-card stat-card-link">
                    <p className="stat-card-label">Ingredientes</p>
                    <p className="stat-card-value">{stats.ingredients_count}</p>
                    {stats.ingredients_count === 0 && <p className="stat-card-hint">Cadastre seu primeiro ingrediente →</p>}
                  </Link>
                  <Link to="/recipes" className="stat-card stat-card-link">
                    <p className="stat-card-label">Receitas</p>
                    <p className="stat-card-value">{stats.recipes_count}</p>
                    {stats.recipes_count === 0 && <p className="stat-card-hint">Crie sua primeira receita →</p>}
                  </Link>
                </div>
              </>
            )}
          </AsyncState>
        </div>
      </main>
    </div>
  )
}
