import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AsyncState } from '../components/ui/AsyncState'
import { DashboardService } from '../services/DashboardService'
import type { DashboardData } from '../services/DashboardService'

export function Dashboard() {
  const [stats, setStats] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    DashboardService.get()
      .then(data => setStats(data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <AsyncState loading={loading} error={loadError ? 'Erro ao carregar dashboard.' : null} empty={false}>
            {stats && (
              <>
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
