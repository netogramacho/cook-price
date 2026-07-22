import { api } from '../lib/api'

export interface SalesChannel {
  id: string
  name: string
  fee_pct: number
}

export interface SalesChannelInput {
  name: string
  fee_pct: number
}

export const SalesChannelService = {
  async getAll(): Promise<SalesChannel[]> {
    const res = await api.get<{ data: SalesChannel[] }>('/sales-channels')
    return res.data
  },

  async create(data: SalesChannelInput): Promise<SalesChannel> {
    const res = await api.post<{ data: SalesChannel }>('/sales-channels', data)
    return res.data
  },

  async update(id: string, data: SalesChannelInput): Promise<SalesChannel> {
    const res = await api.put<{ data: SalesChannel }>(`/sales-channels/${id}`, data)
    return res.data
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/sales-channels/${id}`)
  },
}
