import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { FormField } from './ui/FormField'
import { NumericInput } from './ui/NumericInput'
import { TypeSelectCards } from './ui/TypeSelectCards'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { useAppStore } from '../store/useAppStore'
import { parseDecimal } from '../utils/inputs'

interface Props {
  visible: boolean
  initialName?: string
  forceType?: 'ingredient' | 'packaging' | null
  onCreated: (ingredient: Ingredient) => void
  onClose: () => void
}

const TYPE_OPTIONS = [
  { value: 'ingredient', label: 'Ingrediente', description: 'Farinha, manteiga, ovos...' },
  { value: 'packaging',  label: 'Embalagem',   description: 'Caixa, saco, etiqueta...' },
]

export function QuickIngredientModal({ visible, initialName = '', forceType = null, onCreated, onClose }: Props) {
  const { error } = useAppStore()
  const [step, setStep] = useState<'type-select' | 'form'>('type-select')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [form, setForm] = useState({ name: '', type: '', unit: '', package_size: '', last_price: '' })

  useEffect(() => {
    if (visible) {
      setLoading(false)
      setErrors({})
      setForm({ name: initialName, type: forceType ?? '', unit: '', package_size: '', last_price: '' })
      setStep(forceType ? 'form' : 'type-select')
    }
  }, [visible, initialName, forceType])

  function selectType(type: string) {
    setForm(f => ({ ...f, type }))
    setStep('form')
  }

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

  const title = step === 'type-select'
    ? 'Novo Ingrediente'
    : form.type === 'ingredient' ? 'Novo Ingrediente' : 'Nova Embalagem'

  return (
    <Modal visible={visible} title={title} hideActions onClose={onClose}>
      {step === 'type-select' ? (
        <>
          <TypeSelectCards options={TYPE_OPTIONS} onSelect={selectType} />
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          </div>
        </>
      ) : (
        <>
          <FormField label="Nome" error={errors.name?.[0]}>
            <input type="text" value={form.name} placeholder="Ex: Farinha de Trigo"
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </FormField>
          <FormField label="Unidade" error={errors.unit?.[0]}>
            <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
              <option value="">Selecione...</option>
              <option value="g">g (gramas)</option>
              <option value="ml">ml (mililitros)</option>
              <option value="un">un (unidade)</option>
            </select>
          </FormField>
          <FormField label="Tamanho do Pacote" error={errors.package_size?.[0]}>
            <NumericInput value={form.package_size} placeholder="Ex: 500"
              onChange={v => setForm(f => ({ ...f, package_size: v }))} />
          </FormField>
          <FormField label="Preço do Pacote (R$)" error={errors.last_price?.[0]}>
            <NumericInput value={form.last_price} placeholder="0,00"
              onChange={v => setForm(f => ({ ...f, last_price: v }))} />
          </FormField>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" disabled={loading}
              onClick={() => forceType ? onClose() : setStep('type-select')}>
              {forceType ? 'Cancelar' : '← Voltar'}
            </button>
            <button type="button" className="btn btn-primary" disabled={loading} onClick={save}>
              {loading ? 'Salvando...' : 'Criar'}
            </button>
          </div>
        </>
      )}
    </Modal>
  )
}
