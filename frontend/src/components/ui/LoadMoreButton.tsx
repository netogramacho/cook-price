interface Props {
  hasMore: boolean
  loading: boolean
  onLoadMore: () => void
  size?: 'sm' | 'default'
}

export function LoadMoreButton({ hasMore, loading, onLoadMore, size = 'default' }: Props) {
  if (!hasMore) return null

  const cls = size === 'sm' ? 'btn btn-secondary btn-sm' : 'btn btn-secondary'

  return (
    <div className="load-more">
      <button className={cls} disabled={loading} onClick={onLoadMore}>
        {loading ? 'Carregando...' : 'Ver mais'}
      </button>
    </div>
  )
}
