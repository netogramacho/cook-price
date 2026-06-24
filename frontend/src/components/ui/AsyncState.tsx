import { EmptyState } from './EmptyState'

interface Props {
  loading: boolean
  error?: string | null
  empty: boolean
  emptyEntityName?: string
  emptySearch?: string
  emptyMessage?: string
  emptyAction?: { label: string; onClick: () => void }
  onRetry?: () => void
  children: React.ReactNode
}

export function AsyncState({ loading, error, empty, emptyEntityName = 'item', emptySearch, emptyMessage, emptyAction, onRetry, children }: Props) {
  if (loading) {
    return (
      <div className="skeleton-list" aria-busy="true" aria-label="Carregando">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton-row" />)}
      </div>
    )
  }
  if (error) {
    return (
      <div className="error-state">
        <p>{error}</p>
        {onRetry && <button className="btn btn-secondary btn-sm" onClick={onRetry}>Tentar novamente</button>}
      </div>
    )
  }
  if (empty) return <EmptyState entityName={emptyEntityName} search={emptySearch} message={emptyMessage} action={emptyAction} />
  return <>{children}</>
}
