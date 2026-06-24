import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { FormField } from './ui/FormField'
import { NumericInput } from './ui/NumericInput'
import { InsumoService } from '../services/InsumoService'
import type { Insumo } from '../services/InsumoService'
import { useAppStore } from '../store/useAppStore'
import { parseDecimal, capitalizeFirst } from '../utils/inputs'
import { INGREDIENT_UNITS, unitLabel } from '../utils/units'

interface Props {
  visible: boolean
  initialName?: string
  onCreated: (insumo: Insumo) => void
  onClose: () => void
}

export function QuickInsumoModal({ visible, initialName = '', onCreated, onClose }: Props) {
  const { error } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [form, setForm] = useState({ name: '', unit: 'un', package_size: '1', last_price: '' })

  useEffect(() => {
    if (visible) {
      setLoading(false)
      setErrors({})
      setForm({ name: initialName, unit: 'un', package_size: '1', last_price: '' })
    }
  }, [visible, initialName])

  async function save() {
    setLoading(true)
    setErrors({})
    try {
      const insumo = await InsumoService.create({
        ...form,
        package_size: parseDecimal(form.package_size),
        last_price: parseDecimal(form.last_price),
      } as unknown as Partial<Insumo>)
      onCreated(insumo)
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      setErrors(e.errors ?? {})
      if (!e.errors) error(e.message ?? 'Erro ao criar insumo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} title="Novo Insumo" hideActions onClose={onClose}>
      <FormField label="Nome do Insumo" error={errors.name?.[0]}>
        <input type="text" value={form.name}
          placeholder="Ex: Caixa kraft 6 doces"
          onChange={e => setForm(f => ({ ...f, name: capitalizeFirst(e.target.value) }))} />
      </FormField>
      <FormField label="Unidade" error={errors.unit?.[0]}>
        <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
          {INGREDIENT_UNITS.map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}
        </select>
      </FormField>
      <FormField label="Qtd no Pacote" error={errors.package_size?.[0]}>
        <NumericInput value={form.package_size} placeholder="Ex: 1"
          onChange={v => setForm(f => ({ ...f, package_size: v }))} />
      </FormField>
      <FormField label="Preço do Pacote (R$)" error={errors.last_price?.[0]}>
        <NumericInput value={form.last_price} placeholder="0,00"
          onChange={v => setForm(f => ({ ...f, last_price: v }))} />
      </FormField>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" disabled={loading} onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={loading} onClick={save}>
          {loading ? 'Salvando...' : 'Criar'}
        </button>
      </div>
    </Modal>
  )
}
