import { useState } from 'react'

export interface BaseModalState {
  visible: boolean
  loading: boolean
  errors: Record<string, string[]>
}

export function useModal<T extends BaseModalState>(initial: T) {
  const [state, setState] = useState<T>(initial)

  return {
    state,
    open: (overrides?: Partial<T>) =>
      setState(s => ({ ...s, visible: true, loading: false, errors: {}, ...overrides } as T)),
    close: () => setState(s => ({ ...s, visible: false })),
    startSubmit: () => setState(s => ({ ...s, loading: true, errors: {} })),
    setLoading: (loading: boolean) => setState(s => ({ ...s, loading })),
    setErrors: (errors: Record<string, string[]>) => setState(s => ({ ...s, errors })),
    patch: (patch: Partial<T>) => setState(s => ({ ...s, ...patch })),
  }
}
