import { useState, useEffect } from 'react'
import { FormField } from './ui/FormField'
import { NumericInput } from './ui/NumericInput'
import { InvisibleCostField } from './ui/InvisibleCostField'
import { IngredientAutocomplete } from './IngredientAutocomplete'
import { QuickIngredientModal } from './QuickIngredientModal'
import type { Recipe, RecipeIngredient } from '../services/RecipeService'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { UserService } from '../services/UserService'
import { getUser } from '../lib/auth'
import { triggerPlanUpgrade } from '../lib/api'
import { useAppStore } from '../store/useAppStore'
import { handleApiError } from '../utils/apiError'
import { fmtQuantity } from '../utils/formatters'
import { parseDecimal, capitalizeFirst } from '../utils/inputs'
import { baseUnit, familyOf, unitsInFamily } from '../utils/units'

interface IngredientRow { ingredient_id: string; quantity: string; unit: string }

interface RecipeFormPayload {
  name: string
  description?: string
  yield: number
  yield_unit: string
  invisible_cost_pct: number
  profit_multiplier: number
  ingredients: { ingredient_id: string; quantity: number; unit: string }[]
}

interface Props {
  initial?: Recipe
  submitLabel?: string
  onSubmit: (payload: RecipeFormPayload) => Promise<void>
  onCancel: () => void
}

export function RecipeForm({ initial, submitLabel = 'Salvar Receita', onSubmit, onCancel }: Props) {
  const { error } = useAppStore()

  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: String(initial?.description ?? ''),
    yield: initial ? String(initial.yield) : '',
    yield_unit: initial?.yield_unit ?? '',
    invisible_cost_pct: Number(initial?.invisible_cost_pct ?? 25),
  })
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(
    initial
      ? (initial.ingredients as RecipeIngredient[]).map(i => ({ ingredient_id: i.id, quantity: fmtQuantity(i.quantity), unit: i.unit }))
      : [{ ingredient_id: '', quantity: '', unit: '' }]
  )
  const [quickCreate, setQuickCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    const loads: [Promise<Ingredient[]>, Promise<unknown>?] = [IngredientService.getAll()]
    if (!initial) loads[1] = UserService.get()
    Promise.all(loads)
      .then(([ingredients, user]) => {
        setAvailableIngredients(ingredients)
        if (!initial && user) {
          setForm(f => ({ ...f, invisible_cost_pct: Number((user as Record<string, unknown>).invisible_cost_pct ?? 25) }))
        }
      })
      .catch(() => error('Erro ao carregar dados.'))
  }, [])

  function updateRow(index: number, field: keyof IngredientRow, value: string) {
    setIngredientRows(rows => rows.map((r, i) => {
      if (i !== index) return r
      if (field === 'ingredient_id') {
        const found = availableIngredients.find(a => a.id === value)
        return { ...r, ingredient_id: value, unit: found ? baseUnit(found.unit) : '' }
      }
      return { ...r, [field]: value }
    }))
  }

  async function save() {
    const clientErrors: Record<string, string[]> = {}
    if (!form.name.trim()) clientErrors.name = ['O nome é obrigatório.']
    if (!form.yield) clientErrors.yield = ['O rendimento é obrigatório.']
    if (!form.yield_unit.trim()) clientErrors.yield_unit = ['A unidade é obrigatória.']
    const ingredients = ingredientRows
      .filter(r => r.ingredient_id && r.quantity)
      .map(r => ({ ingredient_id: r.ingredient_id, quantity: parseDecimal(r.quantity), unit: r.unit }))
    if (!ingredients.length) clientErrors.ingredients = ['Adicione ao menos um ingrediente.']
    if (Object.keys(clientErrors).length) { setErrors(clientErrors); return }

    setSaving(true)
    setErrors({})
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        yield: parseDecimal(form.yield),
        yield_unit: form.yield_unit.trim(),
        invisible_cost_pct: parseDecimal(String(form.invisible_cost_pct)),
        profit_multiplier: Number(initial?.profit_multiplier ?? 3),
        ingredients,
      })
    } catch (err) {
      handleApiError(err, setErrors, error, 'Erro ao salvar receita.')
    } finally {
      setSaving(false)
    }
  }

  function onQuickCreated(ingredient: Ingredient) {
    setAvailableIngredients(prev => [...prev, ingredient])
    setIngredientRows(rows => {
      const emptyIdx = rows.findIndex(r => !r.ingredient_id)
      const row = { ingredient_id: ingredient.id, quantity: '', unit: baseUnit(ingredient.unit) }
      if (emptyIdx >= 0) return rows.map((r, i) => i === emptyIdx ? { ...r, ...row, quantity: r.quantity } : r)
      return [...rows, row]
    })
    setQuickCreate(false)
  }

  return (
    <div className="form-card">
      <FormField label="Nome da Receita" error={errors.name?.[0]}>
        <input type="text" value={form.name} placeholder="Ex: Massa de brigadeiro"
          onChange={e => setForm(f => ({ ...f, name: capitalizeFirst(e.target.value) }))} />
      </FormField>

      <div className="form-group">
        <label>Descrição (opcional)</label>
        <textarea rows={2} value={form.description} placeholder="Descreva a receita..."
          onChange={e => setForm(f => ({ ...f, description: capitalizeFirst(e.target.value) }))} />
      </div>

      <div className="field-grid">
        <FormField label="Rendimento" error={errors.yield?.[0]}>
          <NumericInput value={form.yield} placeholder="10" onChange={v => setForm(f => ({ ...f, yield: v }))} />
        </FormField>
        <FormField label="Unidade" error={errors.yield_unit?.[0]}>
          <input type="text" value={form.yield_unit} placeholder="Porções"
            onChange={e => setForm(f => ({ ...f, yield_unit: capitalizeFirst(e.target.value) }))} />
        </FormField>
      </div>

      <InvisibleCostField
        value={form.invisible_cost_pct}
        onChange={v => setForm(f => ({ ...f, invisible_cost_pct: Number(v) }))}
        error={errors.invisible_cost_pct?.[0]}
        locked={!getUser()?.plan.has_pricing}
        onLockedClick={() => triggerPlanUpgrade('A precificação avançada está disponível nos planos pagos.')}
      />

      <div className="form-section-header">
        <p className="section-title" style={{ marginBottom: 0 }}>Ingredientes</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuickCreate(true)}>+ Criar novo ingrediente</button>
      </div>
      <span className="field-error">{errors.ingredients?.[0] ?? ''}</span>

      <div className="ingredient-rows">
        {ingredientRows.map((row, index) => {
          const selected = availableIngredients.find(a => a.id === row.ingredient_id)
          const unitOptions = selected ? unitsInFamily(familyOf(selected.unit)) : []
          return (
            <div key={index} className="ingredient-row ingredient-row--unit">
              <IngredientAutocomplete
                value={row.ingredient_id}
                options={availableIngredients}
                onChange={id => updateRow(index, 'ingredient_id', id)}
              />
              <NumericInput value={row.quantity} placeholder="Qtd" onChange={v => updateRow(index, 'quantity', v)} />
              <select className="qty-unit-select" value={row.unit} disabled={!row.ingredient_id}
                onChange={e => updateRow(index, 'unit', e.target.value)}>
                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setIngredientRows(rows => rows.filter((_, i) => i !== index))}>×</button>
            </div>
          )
        })}
      </div>
      <button type="button" className="btn btn-secondary btn-sm mt-8" onClick={() => setIngredientRows(r => [...r, { ingredient_id: '', quantity: '', unit: '' }])}>+ Adicionar Ingrediente</button>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? 'Salvando...' : submitLabel}
        </button>
      </div>

      <QuickIngredientModal
        visible={quickCreate}
        forceType="ingredient"
        onCreated={onQuickCreated}
        onClose={() => setQuickCreate(false)}
      />
    </div>
  )
}
