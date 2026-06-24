import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { FormField } from './ui/FormField'
import { NumericInput } from './ui/NumericInput'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { useAppStore } from '../store/useAppStore'
import { parseDecimal, capitalizeFirst } from '../utils/inputs'
import { INGREDIENT_UNITS, unitLabel } from '../utils/units'

interface Props {
  visible: boolean
  initialName?: string
  forceType?: 'ingredient'
  onCreated: (ingredient: Ingredient) => void
  onClose: () => void
}

export function QuickIngredientModal({ visible, initialName = '', onCreated, onClose }: Props) {
  const { error } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [form, setForm] = useState({ name: '', unit: '', package_size: '', last_price: '' })

  useEffect(() => {
    if (visible) {
      setLoading(false)
      setErrors({})
      setForm({ name: initialName, unit: '', package_size: '', last_price: '' })
    }
  }, [visible, initialName])

  async function save() {
    setLoading(true)
    setErrors({})
    try {
      const ingredient = await IngredientService.create({
        ...form,
        package_size: parseDecimal(form.package_size),
        last_price: parseDecimal(form.last_price),
      } as unknown as Partial<Ingredient>)
      onCreated(ingredient)
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      setErrors(e.errors ?? {})
      if (!e.errors) error(e.message ?? 'Erro ao criar ingrediente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal visible={visible} title="Novo Ingrediente" hideActions onClose={onClose}>
      <FormField label="Nome do Ingrediente" error={errors.name?.[0]}>
        <input type="text" value={form.name}
          placeholder="Ex: Farinha de Trigo"
          onChange={e => setForm(f => ({ ...f, name: capitalizeFirst(e.target.value) }))} />
      </FormField>
      <FormField label="Unidade" error={errors.unit?.[0]}>
        <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
          <option value="" disabled>Selecionar unidade...</option>
          {INGREDIENT_UNITS.map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}
        </select>
      </FormField>
      <FormField label="Tamanho do Pacote" error={errors.package_size?.[0]}>
        <NumericInput value={form.package_size}
          placeholder="Ex: 500"
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
