import { useState, useEffect, useRef } from 'react'

interface PaginatedResult<T> {
  items: T[]
  meta: { current_page: number; last_page: number }
}

interface Options<T> {
  fetchFn: (page: number, search: string) => Promise<PaginatedResult<T>>
  onError: (msg: string) => void
  loadMoreErrorMsg?: string
}

export function usePaginatedList<T>({
  fetchFn,
  onError,
  loadMoreErrorMsg = 'Erro ao carregar mais itens.',
}: Options<T>) {
  const [items, setItems] = useState<T[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | false>(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef('')

  async function fetch(q = searchRef.current) {
    setLoading(true)
    setLoadError(false)
    setItems([])
    setCurrentPage(1)
    try {
      const { items: data, meta } = await fetchFn(1, q.trim())
      setItems(data)
      setCurrentPage(meta.current_page)
      setHasMore(meta.current_page < meta.last_page)
    } catch (err: unknown) {
      setLoadError((err as { message?: string }).message ?? 'Erro ao carregar.')
    } finally {
      setLoading(false)
    }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { items: data, meta } = await fetchFn(currentPage + 1, searchRef.current.trim())
      setItems(prev => [...prev, ...data])
      setCurrentPage(meta.current_page)
      setHasMore(meta.current_page < meta.last_page)
    } catch {
      onError(loadMoreErrorMsg)
    } finally {
      setLoadingMore(false)
    }
  }

  function handleSearch(q: string) {
    searchRef.current = q
    setSearch(q)
    fetch(q)
  }

  useEffect(() => { fetch() }, [])

  return { items, setItems, currentPage, hasMore, loading, loadingMore, loadError, search, handleSearch, loadMore, refetch: fetch }
}
