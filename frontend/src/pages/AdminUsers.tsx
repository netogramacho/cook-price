import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchBar } from '../components/ui/SearchBar'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { AdminService } from '../services/AdminService'
import type { AdminUserListItem } from '../services/AdminService'
import { useAppStore } from '../store/useAppStore'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { fmtDate } from '../utils/formatters'

export function AdminUsers() {
  const navigate = useNavigate()
  const { error } = useAppStore()

  const { items: users, hasMore, loading, loadingMore, loadError, search, handleSearch, loadMore, refetch } =
    usePaginatedList<AdminUserListItem>({
      fetchFn: (page, q) => AdminService.listUsers(page, q),
      onError: error,
      loadMoreErrorMsg: 'Erro ao carregar mais usuários.',
    })

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <PageHeader title="Admin · Usuários" />
          <SearchBar placeholder="Buscar por nome ou e-mail..." value={search} onChange={handleSearch} />

          <AsyncState loading={loading} error={loadError || null} onRetry={refetch}
            empty={!users.length} emptyEntityName="usuário" emptySearch={search}>
            <div className="table-wrapper admin-users-table">
              <table>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>E-mail</th>
                    <th>Plano</th>
                    <th>Verificado</th>
                    <th>Cadastro</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="admin-row" onClick={() => navigate(`/admin/users/${u.id}`)}>
                      <td>
                        {u.name}
                        {u.is_admin && <span className="badge badge-admin" style={{ marginLeft: 8 }}>admin</span>}
                      </td>
                      <td>{u.email}</td>
                      <td><span className="badge badge-ingredient">{u.plan?.label ?? '—'}</span></td>
                      <td>
                        {u.email_verified_at
                          ? <span className="badge badge-authorized">Sim</span>
                          : <span className="badge badge-cancelled">Não</span>}
                      </td>
                      <td>{fmtDate(u.created_at)}</td>
                      <td className="td-actions">
                        <button className="btn btn-secondary btn-sm" onClick={e => { e.stopPropagation(); navigate(`/admin/users/${u.id}`) }}>Ver</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />
          </AsyncState>
        </div>
      </main>
    </div>
  )
}
