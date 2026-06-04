import { create } from 'zustand'

export interface Notification {
  id: number
  message: string
  type: 'success' | 'error'
}

interface AppStore {
  notifications: Notification[]
  isLoading: boolean
  setLoading: (v: boolean) => void
  success: (message: string) => void
  error: (message: string) => void
  remove: (id: number) => void
}

let nextId = 1

export const useAppStore = create<AppStore>((set) => ({
  notifications: [],
  isLoading: false,

  setLoading: (v) => set({ isLoading: v }),

  success: (message) => {
    const id = nextId++
    set((s) => ({ notifications: [...s.notifications, { id, message, type: 'success' }] }))
    setTimeout(() => set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) })), 3000)
  },

  error: (message) => {
    const id = nextId++
    set((s) => ({ notifications: [...s.notifications, { id, message, type: 'error' }] }))
    setTimeout(() => set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) })), 3000)
  },

  remove: (id) => set((s) => ({ notifications: s.notifications.filter(n => n.id !== id) })),
}))
