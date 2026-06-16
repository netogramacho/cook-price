import { useState, useEffect } from 'react'
import { AppHeader } from '../components/AppHeader'
import { PageHeader } from '../components/ui/PageHeader'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { ProductionService } from '../services/ProductionService'
import type { Production } from '../services/ProductionService'
import { useAppStore } from '../store/useAppStore'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'

function fmtDate(dateStr: string) {
  const [year, month, day] = String(dateStr).slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

export function Productions() {
  const { success, error } = useAppStore()

  const [items, setItems] = useState<Production[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const deleteProduction = useConfirmAction<Production>({
    onConfirm: async (item) => {
      await ProductionService.delete(item.id)
      success('Produção excluída.')
      setItems(prev => prev.filter(p => p.id !== item.id))
      setMeta(prev => ({ ...prev, total: prev.total - 1 }))
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
          <PageHeader title="Produções" />

          <AsyncState loading={loading} error={loadError ? 'Erro ao carregar produções.' : null}
            empty={!items.length} emptyEntityName="produção" emptySearch="">
            <div className="table-wrapper">
              <table className="ingredients-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Receita</th>
                    <th>Rendimento</th>
                    <th>Custo Total</th>
                    <th>Custo Unit.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => (
                    <tr key={p.id}>
                      <td>{fmtDate(p.produced_at)}</td>
                      <td>{p.snapshot.recipe_name}</td>
                      <td>{fmtQuantity(p.total_yield)} {p.snapshot.yield_unit}</td>
                      <td>R$ {fmtCurrency(p.total_cost)}</td>
                      <td>R$ {fmtCurrency(p.unit_cost)}</td>
                      <td>
                        <div className="td-actions">
                          <button className="btn btn-danger btn-sm" onClick={() => deleteProduction.open(p)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <LoadMoreButton hasMore={meta.current_page < meta.last_page} loading={loadingMore} onLoadMore={loadMore} />
            </div>
          </AsyncState>
        </div>
      </main>

      <ConfirmModal
        visible={deleteProduction.confirm.visible}
        title="Excluir Produção"
        message={<>Excluir a produção de <strong>{deleteProduction.confirm.item?.snapshot.recipe_name}</strong>? Esta ação não pode ser desfeita.</>}
        loading={deleteProduction.confirm.loading}
        confirmText="Excluir"
        onConfirm={deleteProduction.execute}
        onClose={deleteProduction.close}
      />
    </div>
  )
}
