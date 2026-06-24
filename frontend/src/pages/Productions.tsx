import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUser } from '../lib/auth'
import { AppHeader } from '../components/AppHeader'
import { PageHeader } from '../components/ui/PageHeader'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { ProductionCard } from '../components/ProductionCard'
import { ProductionService } from '../services/ProductionService'
import type { Production, ProductionSummary } from '../services/ProductionService'
import { useAppStore } from '../store/useAppStore'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'

export function Productions() {
  const navigate = useNavigate()
  const { success, error } = useAppStore()

  const hasProd = !!getUser()?.plan.has_production
  useEffect(() => {
    if (!hasProd) navigate('/dashboard')
  }, [hasProd])

  const [summary, setSummary] = useState<ProductionSummary | null>(null)
  const [items, setItems] = useState<Production[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const cancelProduction = useConfirmAction<Production>({
    onConfirm: async (item) => {
      const updated = await ProductionService.cancel(item.id)
      success('Produção cancelada.')
      setItems(prev => prev.map(p => p.id === updated.id ? updated : p))
      ProductionService.getSummary().then(setSummary).catch(() => {})
    },
    onError: error,
  })

  async function fetchPage(page: number, append = false) {
    try {
      const result = await ProductionService.getPaginated(page)
      setItems(prev => append ? [...prev, ...result.items] : result.items)
      setMeta(result.meta)
    } catch {
      setLoadError(true)
    }
  }

  useEffect(() => {
    ProductionService.getSummary().then(setSummary).catch(() => error('Erro ao carregar resumo de produções.'))
    fetchPage(1).finally(() => setLoading(false))
  }, [])

  async function loadMore() {
    if (loadingMore || meta.current_page >= meta.last_page) return
    setLoadingMore(true)
    await fetchPage(meta.current_page + 1, true).finally(() => setLoadingMore(false))
  }

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <PageHeader title="Lotes" />

          <div className="production-summary">
            <div className="production-summary-card">
              <span className="production-summary-label">Hoje</span>
              <strong className="production-summary-cost">{summary ? `R$ ${fmtCurrency(summary.today.cost)}` : '—'}</strong>
              {summary && (summary.today.batches > 0
                ? <span className="production-summary-meta">{summary.today.batches} {summary.today.batches === 1 ? 'lote' : 'lotes'} · {fmtQuantity(summary.today.items)} itens</span>
                : <span className="production-summary-meta">Nenhuma produção hoje</span>
              )}
            </div>
            <div className="production-summary-card production-summary-card--month">
              <span className="production-summary-label">Este mês</span>
              <strong className="production-summary-cost">{summary ? `R$ ${fmtCurrency(summary.month.cost)}` : '—'}</strong>
              {summary && (summary.month.batches > 0
                ? <span className="production-summary-meta">{summary.month.batches} {summary.month.batches === 1 ? 'lote' : 'lotes'} · {fmtQuantity(summary.month.items)} itens</span>
                : <span className="production-summary-meta">Nenhuma produção este mês</span>
              )}
            </div>
          </div>

          <AsyncState loading={loading} error={loadError ? 'Erro ao carregar produções.' : null}
            onRetry={() => { setLoadError(false); setLoading(true); fetchPage(1).finally(() => setLoading(false)) }}
            empty={!items.length} emptyEntityName="produção" emptySearch=""
            emptyAction={{ label: 'Ir para Produtos', onClick: () => navigate('/produtos') }}>
            <div className="production-list">
              {items.map(p => (
                <ProductionCard key={p.id} production={p} onCancel={cancelProduction.open} />
              ))}
              <LoadMoreButton hasMore={meta.current_page < meta.last_page} loading={loadingMore} onLoadMore={loadMore} />
            </div>
          </AsyncState>
        </div>
      </main>

      <ConfirmModal
        visible={cancelProduction.confirm.visible}
        title="Cancelar Produção"
        message={<>Cancelar a produção de <strong>{cancelProduction.confirm.item?.snapshot.product_name ?? cancelProduction.confirm.item?.snapshot.recipe_name}</strong>? O registro ficará no histórico como cancelado.</>}
        loading={cancelProduction.confirm.loading}
        confirmText="Cancelar produção"
        onConfirm={cancelProduction.execute}
        onClose={cancelProduction.close}
      />
    </div>
  )
}
