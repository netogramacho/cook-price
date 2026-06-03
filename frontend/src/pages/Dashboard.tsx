import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AsyncState } from '../components/ui/AsyncState'
import { DashboardService } from '../services/DashboardService'
import type { DashboardData } from '../services/DashboardService'
import { fmtQuantity } from '../utils/formatters'

interface CriticalItem {
  id: string
  name: string
  unit: string
  stock_quantity: number
  min_stock: number
}

interface ExtendedDashboard extends DashboardData {
  critical_stock: CriticalItem[]
}

export function Dashboard() {
  const [stats, setStats] = useState<ExtendedDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    DashboardService.get()
      .then(data => setStats(data as ExtendedDashboard))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false))
  }, [])

  function fmtStock(item: CriticalItem) {
    return `${fmtQuantity(item.stock_quantity)}${item.unit} / mín ${fmtQuantity(item.min_stock)}${item.unit}`
  }

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

                <div className="critical-stock-section">
                  <p className="critical-stock-title">⚠ Estoque crítico</p>
                  {stats.critical_stock.length > 0 ? (
                    <div className="critical-stock-list">
                      {stats.critical_stock.map(item => (
                        <div key={item.id} className="critical-stock-item">
                          <span className="critical-stock-name">{item.name}</span>
                          <span className="critical-stock-qty">{fmtStock(item)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <p className="critical-stock-empty">Nenhum ingrediente com estoque abaixo do mínimo.</p>
                      <p className="critical-stock-hint">Configure o estoque mínimo de cada ingrediente em <Link to="/stock">Estoque → Ajustar</Link>.</p>
                    </>
                  )}
                </div>
              </>
            )}
          </AsyncState>
        </div>
      </main>
    </div>
  )
}
