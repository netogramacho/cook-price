import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { FormField } from './ui/FormField'
import { NumericInput } from './ui/NumericInput'
import { SalesChannelService } from '../services/SalesChannelService'
import type { SalesChannel } from '../services/SalesChannelService'
import { useAppStore } from '../store/useAppStore'
import { parseDecimal, capitalizeFirst } from '../utils/inputs'
import { fmtQuantity } from '../utils/formatters'

interface Props {
  visible: boolean
  /** Preenchido para editar um app já cadastrado; ausente cria um novo. */
  channel?: { id: string; name: string; fee_pct: number } | null
  onSaved: (channel: SalesChannel) => void
  onClose: () => void
}

export function SalesChannelModal({ visible, channel = null, onSaved, onClose }: Props) {
  const { error } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [form, setForm] = useState({ name: '', fee_pct: '' })

  useEffect(() => {
    if (!visible) return
    setLoading(false)
    setErrors({})
    setForm({
      name: channel?.name ?? '',
      fee_pct: channel ? fmtQuantity(channel.fee_pct) : '',
    })
  }, [visible, channel])

  async function save() {
    const name = form.name.trim()
    if (!name) { setErrors({ name: ['O nome do aplicativo é obrigatório.'] }); return }

    setLoading(true)
    setErrors({})
    try {
      const payload = { name, fee_pct: parseDecimal(form.fee_pct) }
      const saved = channel
        ? await SalesChannelService.update(channel.id, payload)
        : await SalesChannelService.create(payload)
      onSaved(saved)
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      setErrors(e.errors ?? {})
      if (!e.errors) error(e.message ?? 'Erro ao salvar aplicativo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} title={channel ? 'Editar Aplicativo' : 'Novo Aplicativo'} hideActions onClose={onClose}>
      <FormField label="Nome do Aplicativo" error={errors.name?.[0]}>
        <input type="text" value={form.name} placeholder="Ex: iFood"
          onChange={e => setForm(f => ({ ...f, name: capitalizeFirst(e.target.value) }))} />
      </FormField>
      <FormField label="Taxa cobrada pelo app (%)" error={errors.fee_pct?.[0]}>
        <NumericInput value={form.fee_pct} placeholder="Ex: 27"
          onChange={v => setForm(f => ({ ...f, fee_pct: v }))} />
      </FormField>
      <p className="multiplier-hint" style={{ marginTop: 0 }}>
        A taxa vale para todos os seus produtos. O preço no app é calculado para que, depois do desconto, sobre o preço sugerido.
      </p>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" disabled={loading} onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={loading} onClick={save}>
          {loading ? 'Salvando...' : channel ? 'Salvar' : 'Criar'}
        </button>
      </div>
    </Modal>
  )
}
