import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Modal } from '../components/Modal'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchBar } from '../components/ui/SearchBar'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { PurchaseService } from '../services/PurchaseService'
import type { Purchase } from '../services/PurchaseService'
import { useAppStore } from '../store/useAppStore'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'

function fmtDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function Purchases() {
  const { success, error } = useAppStore()

  const { items, hasMore, loading, loadingMore, loadError, search, handleSearch, loadMore, refetch } =
    usePaginatedList({
      fetchFn: (page, q) => PurchaseService.getPaginated(page, q),
      onError: error,
      loadMoreErrorMsg: 'Erro ao carregar mais compras.',
    })

  const [detail, setDetail] = useState<{ visible: boolean; purchase: Purchase | null }>({ visible: false, purchase: null })
  const [resetTarget, setResetTarget] = useState<Purchase | null>(null)
  const [resetLoading, setResetLoading] = useState(false)

  const deletePurchase = useConfirmAction<Purchase>({
    onConfirm: async (item) => {
      try {
        await PurchaseService.delete(item.id)
        success('Compra excluída com sucesso.')
        refetch()
      } catch (err: unknown) {
        const code = (err as { response?: { data?: { error_code?: string } } }).response?.data?.error_code
        if (code === 'PURCHASE_HAS_LATER_MOVEMENTS') {
          setResetTarget(item)
          return
        }
        throw err
      }
    },
    onError: error,
  })

  async function confirmResetAndDelete() {
    if (!resetTarget) return
    setResetLoading(true)
    try {
      await PurchaseService.resetAndDelete(resetTarget.id)
      success('Compra cancelada e ingredientes resetados.')
      setResetTarget(null)
      refetch()
    } catch (err: unknown) {
      error((err as { message?: string }).message ?? 'Erro ao cancelar compra.')
    } finally {
      setResetLoading(false)
    }
  }

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <PageHeader title="Compras" />
          <SearchBar placeholder="Buscar por observação..." value={search} onChange={handleSearch} />

          <AsyncState loading={loading} error={loadError || null}
            empty={!items.length} emptyEntityName="compra" emptySearch={search}>
            <div className="table-wrapper">
              <table className="ingredients-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Observações</th>
                    <th>Itens</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => (
                    <tr key={p.id}>
                      <td>{fmtDate(p.purchased_at)}</td>
                      <td>{p.notes || '—'}</td>
                      <td>{p.items.length}</td>
                      <td>R$ {fmtCurrency(p.total_value)}</td>
                      <td>
                        <div className="td-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => setDetail({ visible: true, purchase: p })}>Ver detalhes</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deletePurchase.open(p)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />
            </div>
          </AsyncState>
        </div>
      </main>

      <Modal
        visible={detail.visible}
        title={`Compra — ${fmtDate(detail.purchase?.purchased_at ?? null)}`}
        loading={false}
        hideActions
        wide
        onClose={() => setDetail({ visible: false, purchase: null })}
      >
        {detail.purchase && (
          <>
            {detail.purchase.notes && (
              <p style={{ marginBottom: '1rem', color: 'var(--color-text-muted)' }}>{detail.purchase.notes}</p>
            )}
            <table className="ingredients-table">
              <thead>
                <tr>
                  <th>Ingrediente</th>
                  <th>Qtd. total</th>
                  <th>Pacotes × preço</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {detail.purchase.items.map(item => (
                  <tr key={item.id}>
                    <td>{item.ingredient.name}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtQuantity(item.quantity)} {item.ingredient.unit}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtQuantity(item.num_packages)} × R$ {fmtCurrency(item.price_paid)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>R$ {fmtCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}><strong>Total da compra</strong></td>
                  <td><strong>R$ {fmtCurrency(detail.purchase.total_value)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </Modal>

      <ConfirmModal
        visible={deletePurchase.confirm.visible}
        title="Excluir Compra"
        message={<>Excluir a compra de <strong>{fmtDate(deletePurchase.confirm.item?.purchased_at ?? null)}</strong>? O estoque dos ingredientes será revertido ao estado anterior. Esta ação não pode ser desfeita.</>}
        loading={deletePurchase.confirm.loading}
        confirmText="Excluir"
        onConfirm={deletePurchase.execute}
        onClose={deletePurchase.close}
      />

      <Modal
        visible={!!resetTarget}
        title="Movimentos posteriores detectados"
        loading={resetLoading}
        submitText="Resetar ingredientes e cancelar compra"
        onClose={() => setResetTarget(null)}
        onSubmit={confirmResetAndDelete}
      >
        <p style={{ marginBottom: '1rem' }}>
          Esta compra tem movimentos de estoque posteriores. Não é possível reverter os valores automaticamente.
        </p>
        <p style={{ marginBottom: '0.5rem' }}>
          O estoque dos seguintes ingredientes será <strong>zerado</strong>:
        </p>
        <ul style={{ marginLeft: '1.5rem', marginBottom: '1rem' }}>
          {resetTarget?.items.map(item => (
            <li key={item.id}>{item.ingredient.name}</li>
          ))}
        </ul>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>
          A compra ficará arquivada para auditoria. Re-registre as compras corretas após o reset.
        </p>
      </Modal>
    </div>
  )
}
