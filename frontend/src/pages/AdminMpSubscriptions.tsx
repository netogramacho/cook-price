import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { PageHeader } from '../components/ui/PageHeader'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AdminService } from '../services/AdminService'
import type { MpPreapproval, MpStatus } from '../services/AdminService'
import { useAppStore } from '../store/useAppStore'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { fmtCurrency, fmtDate } from '../utils/formatters'

type Filter = 'authorized' | 'paused' | ''

const MP_STATUS_LABEL: Record<MpStatus, string> = {
  authorized: 'Ativa',
  pending: 'Pendente',
  paused: 'Pausada',
  cancelled: 'Cancelada',
}

const LIMIT = 50

export function AdminMpSubscriptions() {
  const navigate = useNavigate()
  const { success, error } = useAppStore()

  const [items, setItems] = useState<MpPreapproval[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('authorized')

  async function load(f: Filter) {
    setLoading(true)
    setLoadError(null)
    try {
      const { items: data, paging } = await AdminService.listMpSubscriptions(f, LIMIT, 0)
      setItems(data)
      setTotal(paging.total)
      setOffset(data.length)
    } catch (err) {
      setLoadError((err as { message?: string }).message ?? 'Erro ao carregar assinaturas do MercadoPago.')
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { items: data, paging } = await AdminService.listMpSubscriptions(filter, LIMIT, offset)
      setItems(prev => [...prev, ...data])
      setTotal(paging.total)
      setOffset(prev => prev + data.length)
    } catch {
      error('Erro ao carregar mais assinaturas.')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => { load(filter) }, [filter])

  const cancelSub = useConfirmAction<MpPreapproval>({
    onConfirm: async (sub) => {
      await AdminService.cancelMpSubscription(sub.id)
      success('Assinatura cancelada no MercadoPago.')
      await load(filter)
    },
    onError: error,
  })

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <PageHeader title="Admin · Assinaturas no MercadoPago" />

          <div className="admin-filter-tabs">
            {([['authorized', 'Ativas'], ['paused', 'Pausadas'], ['', 'Todas']] as [Filter, string][]).map(([v, label]) => (
              <button key={v || 'all'} className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(v)}>{label}</button>
            ))}
          </div>

          <AsyncState loading={loading} error={loadError} onRetry={() => load(filter)}
            empty={!items.length} emptyEntityName="assinatura"
            emptyMessage="Nenhuma assinatura encontrada no MercadoPago para este filtro.">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Usuário</th>
                    <th>E-mail (pagador)</th>
                    <th>Valor</th>
                    <th>Próxima cobrança</th>
                    <th>Status</th>
                    <th>ID MercadoPago</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(sub => (
                    <tr key={sub.id}>
                      <td>
                        {sub.local_user
                          ? <button className="link-button" onClick={() => navigate(`/admin/users/${sub.local_user!.id}`)}>{sub.local_user.name}</button>
                          : <span className="text-muted">— sem vínculo —</span>}
                      </td>
                      <td>{sub.payer_email ?? '—'}</td>
                      <td>{sub.amount != null ? `R$ ${fmtCurrency(sub.amount)}` : '—'}</td>
                      <td>{fmtDate(sub.next_payment_date)}</td>
                      <td>{sub.status ? <span className={`badge badge-${sub.status}`}>{MP_STATUS_LABEL[sub.status]}</span> : '—'}</td>
                      <td><span className="admin-sub-meta">{sub.id}</span></td>
                      <td className="td-actions">
                        {sub.status && sub.status !== 'cancelled' && (
                          <button className="btn btn-danger btn-sm" onClick={() => cancelSub.open(sub)}>Cancelar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <LoadMoreButton hasMore={items.length < total} loading={loadingMore} onLoadMore={loadMore} />
          </AsyncState>
        </div>
      </main>

      <ConfirmModal
        visible={cancelSub.confirm.visible}
        title="Cancelar Assinatura no MercadoPago"
        message={<>Cancelar a assinatura de <strong>{cancelSub.confirm.item?.payer_email ?? cancelSub.confirm.item?.id}</strong> no MercadoPago? {cancelSub.confirm.item?.local_user ? 'A assinatura local vinculada será encerrada ao fim do período pago.' : 'Não há assinatura local vinculada — o cancelamento ocorre apenas no MercadoPago.'}</>}
        loading={cancelSub.confirm.loading}
        confirmText="Cancelar assinatura"
        onConfirm={cancelSub.execute}
        onClose={cancelSub.close}
      />
    </div>
  )
}
