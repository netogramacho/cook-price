import { getToken, logout } from './auth'

let loadingCount = 0
const loadingListeners: Array<(loading: boolean) => void> = []

export function subscribeLoading(fn: (loading: boolean) => void) {
  loadingListeners.push(fn)
  return () => {
    const i = loadingListeners.indexOf(fn)
    if (i !== -1) loadingListeners.splice(i, 1)
  }
}

function setLoading(active: boolean) {
  loadingCount = active ? loadingCount + 1 : Math.max(0, loadingCount - 1)
  loadingListeners.forEach(fn => fn(loadingCount > 0))
}

async function request<T>(method: string, endpoint: string, data?: unknown): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  setLoading(true)
  try {
    const res = await fetch(`/api${endpoint}`, {
      method,
      headers,
      body: data !== undefined ? JSON.stringify(data) : undefined,
    })

    if (res.status === 401) {
      logout()
      window.location.href = '/login'
      throw new Error('Não autorizado')
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw err
    }

    if (res.status === 204) return null as T
    return res.json()
  } finally {
    setLoading(false)
  }
}

export const api = {
  get: <T>(endpoint: string) => request<T>('GET', endpoint),
  post: <T>(endpoint: string, data?: unknown) => request<T>('POST', endpoint, data),
  put: <T>(endpoint: string, data?: unknown) => request<T>('PUT', endpoint, data),
  patch: <T>(endpoint: string, data?: unknown) => request<T>('PATCH', endpoint, data),
  delete: <T>(endpoint: string) => request<T>('DELETE', endpoint),
}
