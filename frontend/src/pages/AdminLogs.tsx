import { Fragment, useEffect, useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { PageHeader } from '../components/ui/PageHeader'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { AdminService } from '../services/AdminService'
import type { IntegrationLog } from '../services/AdminService'
import { useAppStore } from '../store/useAppStore'
import { fmtDateTime } from '../utils/formatters'

type Filter = '' | 'success' | 'error'

export function AdminLogs() {
  const { error } = useAppStore()

  const [logs, setLogs] = useState<IntegrationLog[]>([])
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('')
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load(f: Filter) {
    setLoading(true)
    setLoadError(null)
    try {
      const { items, meta } = await AdminService.listLogs(1, f)
      setLogs(items)
      setPage(meta.current_page)
      setLastPage(meta.last_page)
    } catch (err) {
      setLoadError((err as { message?: string }).message ?? 'Erro ao carregar logs.')
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { items, meta } = await AdminService.listLogs(page + 1, filter)
      setLogs(prev => [...prev, ...items])
      setPage(meta.current_page)
      setLastPage(meta.last_page)
    } catch {
      error('Erro ao carregar mais logs.')
    } finally {
      setLoadingMore(false)
    }
  }

  useEffect(() => { load(filter) }, [filter])

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <PageHeader title="Admin · Logs MercadoPago" />

          <div className="admin-filter-tabs">
            {([['', 'Todos'], ['success', 'Sucesso'], ['error', 'Erro']] as [Filter, string][]).map(([v, label]) => (
              <button key={v} className={`btn btn-sm ${filter === v ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilter(v)}>{label}</button>
            ))}
          </div>

          <AsyncState loading={loading} error={loadError} onRetry={() => load(filter)} empty={!logs.length} emptyEntityName="log">
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Serviço</th>
                    <th>Tipo</th>
                    <th>Direção</th>
                    <th>HTTP</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <Fragment key={log.id}>
                      <tr className="admin-row" onClick={() => setExpanded(e => e === log.id ? null : log.id)}>
                        <td>{fmtDateTime(log.created_at)}</td>
                        <td>{log.service}</td>
                        <td>{log.type ?? '—'}</td>
                        <td>{log.direction}</td>
                        <td>{log.status_code ?? '—'}</td>
                        <td>{log.success
                          ? <span className="badge badge-authorized">OK</span>
                          : <span className="badge badge-cancelled">Erro</span>}</td>
                        <td className="td-actions">
                          <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); setExpanded(x => x === log.id ? null : log.id) }}>
                            {expanded === log.id ? 'Ocultar' : 'Detalhes'}
                          </button>
                        </td>
                      </tr>
                      {expanded === log.id && (
                        <tr>
                          <td colSpan={7}>
                            {log.error_message && <p className="admin-log-error">{log.error_message}</p>}
                            <pre className="admin-log-json">{JSON.stringify({ payload: log.payload, response: log.response }, null, 2)}</pre>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            <LoadMoreButton hasMore={page < lastPage} loading={loadingMore} onLoadMore={loadMore} />
          </AsyncState>
        </div>
      </main>
    </div>
  )
}
