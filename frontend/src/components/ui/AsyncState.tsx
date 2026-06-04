import { EmptyState } from './EmptyState'

interface Props {
  loading: boolean
  error?: string | null
  empty: boolean
  emptyEntityName?: string
  emptySearch?: string
  emptyMessage?: string
  children: React.ReactNode
}

export function AsyncState({ loading, error, empty, emptyEntityName = 'item', emptySearch, emptyMessage, children }: Props) {
  if (loading) return <div className="loading">Carregando...</div>
  if (error) return <div className="error-state">{error}</div>
  if (empty) return <EmptyState entityName={emptyEntityName} search={emptySearch} message={emptyMessage} />
  return <>{children}</>
}
