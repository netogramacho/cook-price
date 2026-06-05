import { useState } from 'react'

interface ConfirmState<T> {
  visible: boolean
  loading: boolean
  item: T | null
}

interface Options<T> {
  onConfirm: (item: T) => Promise<void>
  onError: (msg: string) => void
}

export function useConfirmAction<T>({ onConfirm, onError }: Options<T>) {
  const [confirm, setConfirm] = useState<ConfirmState<T>>({
    visible: false,
    loading: false,
    item: null,
  })

  function open(item: T) {
    setConfirm({ visible: true, loading: false, item })
  }

  function close() {
    setConfirm(c => ({ ...c, visible: false }))
  }

  async function execute() {
    if (!confirm.item) return
    setConfirm(c => ({ ...c, loading: true }))
    try {
      await onConfirm(confirm.item)
      setConfirm(c => ({ ...c, visible: false }))
    } catch (err: unknown) {
      onError((err as { message?: string }).message ?? 'Erro ao executar ação.')
    } finally {
      setConfirm(c => ({ ...c, loading: false }))
    }
  }

  return { confirm, open, close, execute }
}
