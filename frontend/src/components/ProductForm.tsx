import { useState, useEffect } from 'react'
import { FormField } from './ui/FormField'
import { NumericInput } from './ui/NumericInput'
import { ProfitMultiplierField } from './ui/ProfitMultiplierField'
import { IngredientAutocomplete } from './IngredientAutocomplete'
import { QuickIngredientModal } from './QuickIngredientModal'
import { QuickInsumoModal } from './QuickInsumoModal'
import type { Product, ProductInput } from '../services/ProductService'
import { RecipeService } from '../services/RecipeService'
import type { Recipe } from '../services/RecipeService'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { InsumoService } from '../services/InsumoService'
import type { Insumo } from '../services/InsumoService'
import { UserService } from '../services/UserService'
import { useAppStore } from '../store/useAppStore'
import { handleApiError } from '../utils/apiError'
import { fmtQuantity } from '../utils/formatters'
import { parseDecimal, capitalizeFirst } from '../utils/inputs'
import { baseUnit, familyOf, unitsInFamily } from '../utils/units'

interface RecipeRow { recipe_id: string; quantity: string }
interface ItemRow { ingredient_id: string; quantity: string; unit: string }

interface Props {
  initial?: Product
  submitLabel?: string
  onSubmit: (payload: ProductInput) => Promise<void>
  onCancel: () => void
}

export function ProductForm({ initial, submitLabel = 'Salvar Produto', onSubmit, onCancel }: Props) {
  const { error } = useAppStore()

  const [availableRecipes, setAvailableRecipes] = useState<Recipe[]>([])
  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
  const [availableInsumos, setAvailableInsumos] = useState<Insumo[]>([])

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    description: String(initial?.description ?? ''),
    yield: initial ? String(initial.yield) : '1',
    yield_unit: initial?.yield_unit ?? 'un',
    profit_multiplier: Number(initial?.profit_multiplier ?? 3),
  })
  const [recipeRows, setRecipeRows] = useState<RecipeRow[]>(
    initial ? initial.recipes.map(r => ({ recipe_id: r.id, quantity: fmtQuantity(r.quantity) })) : [{ recipe_id: '', quantity: '' }]
  )
  const [ingredientRows, setIngredientRows] = useState<ItemRow[]>(
    initial ? initial.ingredients.map(i => ({ ingredient_id: i.id, quantity: fmtQuantity(i.quantity), unit: i.unit })) : []
  )
  const [insumoRows, setInsumoRows] = useState<ItemRow[]>(
    initial ? initial.insumos.map(i => ({ ingredient_id: i.id, quantity: fmtQuantity(i.quantity), unit: i.unit })) : []
  )

  const [quickIngredient, setQuickIngredient] = useState(false)
  const [quickInsumo, setQuickInsumo] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  useEffect(() => {
    Promise.all([RecipeService.getAll(), IngredientService.getAll(), InsumoService.getAll()])
      .then(([recipes, ingredients, insumos]) => {
        setAvailableRecipes(recipes)
        setAvailableIngredients(ingredients)
        setAvailableInsumos(insumos)
      })
      .catch(() => error('Erro ao carregar dados.'))

    // Em produto novo, usa o multiplicador de lucro padrão do usuário (Configurações)
    if (!initial) {
      UserService.get()
        .then(u => setForm(f => ({ ...f, profit_multiplier: Number(u.profit_multiplier ?? 3) })))
        .catch(() => {})
    }
  }, [])

  function updateRecipeRow(index: number, field: keyof RecipeRow, value: string) {
    setRecipeRows(rows => rows.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function setItemRow(setter: typeof setIngredientRows, available: { id: string; unit: string }[], index: number, field: keyof ItemRow, value: string) {
    setter(rows => rows.map((r, i) => {
      if (i !== index) return r
      if (field === 'ingredient_id') {
        const found = available.find(a => a.id === value)
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
    const recipes = recipeRows.filter(r => r.recipe_id && r.quantity).map(r => ({ recipe_id: r.recipe_id, quantity: parseDecimal(r.quantity) }))
    if (!recipes.length) clientErrors.recipes = ['Adicione ao menos uma receita.']
    if (Object.keys(clientErrors).length) { setErrors(clientErrors); return }

    const ingredients = ingredientRows.filter(r => r.ingredient_id && r.quantity).map(r => ({ ingredient_id: r.ingredient_id, quantity: parseDecimal(r.quantity), unit: r.unit }))
    const insumos = insumoRows.filter(r => r.ingredient_id && r.quantity).map(r => ({ ingredient_id: r.ingredient_id, quantity: parseDecimal(r.quantity), unit: r.unit }))

    setSaving(true)
    setErrors({})
    try {
      await onSubmit({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        yield: parseDecimal(form.yield),
        yield_unit: form.yield_unit.trim(),
        invisible_cost_pct: 0,
        profit_multiplier: parseDecimal(String(form.profit_multiplier)),
        recipes,
        ingredients,
        insumos,
      })
    } catch (err) {
      handleApiError(err, setErrors, error, 'Erro ao salvar produto.')
    } finally {
      setSaving(false)
    }
  }

  function onIngredientCreated(ingredient: Ingredient) {
    setAvailableIngredients(prev => [...prev, ingredient])
    setIngredientRows(rows => [...rows, { ingredient_id: ingredient.id, quantity: '', unit: baseUnit(ingredient.unit) }])
    setQuickIngredient(false)
  }
  function onInsumoCreated(insumo: Insumo) {
    setAvailableInsumos(prev => [...prev, insumo])
    setInsumoRows(rows => [...rows, { ingredient_id: insumo.id, quantity: '', unit: baseUnit(insumo.unit) }])
    setQuickInsumo(false)
  }

  const recipeOptions = availableRecipes.map(r => ({ id: r.id, name: r.name, unit: r.yield_unit }))
  const ingredientOptions = availableIngredients.map(i => ({ id: i.id, name: i.name, unit: i.unit }))
  const insumoOptions = availableInsumos.map(i => ({ id: i.id, name: i.name, unit: i.unit }))

  return (
    <div className="form-card">
      <FormField label="Nome do Produto" error={errors.name?.[0]}>
        <input type="text" value={form.name} placeholder="Ex: Brigadeiro gourmet (caixa 6)"
          onChange={e => setForm(f => ({ ...f, name: capitalizeFirst(e.target.value) }))} />
      </FormField>

      <div className="form-group">
        <label>Descrição (opcional)</label>
        <textarea rows={2} value={form.description} placeholder="Descreva o produto..."
          onChange={e => setForm(f => ({ ...f, description: capitalizeFirst(e.target.value) }))} />
      </div>

      <div className="field-grid">
        <FormField label="Rendimento" error={errors.yield?.[0]}>
          <NumericInput value={form.yield} placeholder="6" onChange={v => setForm(f => ({ ...f, yield: v }))} />
        </FormField>
        <FormField label="Unidade" error={errors.yield_unit?.[0]}>
          <input type="text" value={form.yield_unit} placeholder="un"
            onChange={e => setForm(f => ({ ...f, yield_unit: e.target.value }))} />
        </FormField>
      </div>

      <div className="form-section-header">
        <p className="section-title" style={{ marginBottom: 0 }}>Receitas</p>
      </div>
      <span className="field-error">{errors.recipes?.[0] ?? ''}</span>
      <div className="ingredient-rows">
        {recipeRows.map((row, index) => (
          <div key={index} className="ingredient-row">
            <IngredientAutocomplete value={row.recipe_id} options={recipeOptions} placeholder="Buscar receita..."
              onChange={id => updateRecipeRow(index, 'recipe_id', id)} />
            <NumericInput value={row.quantity} placeholder="Qtd" onChange={v => updateRecipeRow(index, 'quantity', v)} />
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setRecipeRows(rows => rows.filter((_, i) => i !== index))}>×</button>
          </div>
        ))}
      </div>
      <button type="button" className="btn btn-secondary btn-sm mt-8" onClick={() => setRecipeRows(r => [...r, { recipe_id: '', quantity: '' }])}>+ Adicionar Receita</button>

      <div className="form-section-header" style={{ marginTop: 20 }}>
        <p className="section-title" style={{ marginBottom: 0 }}>Ingredientes avulsos (opcional)</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuickIngredient(true)}>+ Criar novo ingrediente</button>
      </div>
      <div className="ingredient-rows">
        {ingredientRows.map((row, index) => {
          const selected = ingredientOptions.find(o => o.id === row.ingredient_id)
          const unitOptions = selected ? unitsInFamily(familyOf(selected.unit)) : []
          return (
            <div key={index} className="ingredient-row ingredient-row--unit">
              <IngredientAutocomplete value={row.ingredient_id} options={ingredientOptions} placeholder="Buscar ingrediente..."
                onChange={id => setItemRow(setIngredientRows, ingredientOptions, index, 'ingredient_id', id)} />
              <NumericInput value={row.quantity} placeholder="Qtd" onChange={v => setItemRow(setIngredientRows, ingredientOptions, index, 'quantity', v)} />
              <select className="qty-unit-select" value={row.unit} disabled={!row.ingredient_id}
                onChange={e => setItemRow(setIngredientRows, ingredientOptions, index, 'unit', e.target.value)}>
                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setIngredientRows(rows => rows.filter((_, i) => i !== index))}>×</button>
            </div>
          )
        })}
      </div>
      <button type="button" className="btn btn-secondary btn-sm mt-8" onClick={() => setIngredientRows(r => [...r, { ingredient_id: '', quantity: '', unit: '' }])}>+ Adicionar Ingrediente</button>

      <div className="form-section-header" style={{ marginTop: 20 }}>
        <p className="section-title" style={{ marginBottom: 0 }}>Insumos (opcional)</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setQuickInsumo(true)}>+ Criar novo insumo</button>
      </div>
      <div className="ingredient-rows">
        {insumoRows.map((row, index) => {
          const selected = insumoOptions.find(o => o.id === row.ingredient_id)
          const unitOptions = selected ? unitsInFamily(familyOf(selected.unit)) : []
          return (
            <div key={index} className="ingredient-row ingredient-row--unit">
              <IngredientAutocomplete value={row.ingredient_id} options={insumoOptions} placeholder="Buscar insumo..."
                onChange={id => setItemRow(setInsumoRows, insumoOptions, index, 'ingredient_id', id)} />
              <NumericInput value={row.quantity} placeholder="Qtd" onChange={v => setItemRow(setInsumoRows, insumoOptions, index, 'quantity', v)} />
              <select className="qty-unit-select" value={row.unit} disabled={!row.ingredient_id}
                onChange={e => setItemRow(setInsumoRows, insumoOptions, index, 'unit', e.target.value)}>
                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setInsumoRows(rows => rows.filter((_, i) => i !== index))}>×</button>
            </div>
          )
        })}
      </div>
      <button type="button" className="btn btn-secondary btn-sm mt-8" onClick={() => setInsumoRows(r => [...r, { ingredient_id: '', quantity: '', unit: '' }])}>+ Adicionar Insumo</button>

      <div className="form-section-header" style={{ marginTop: 20 }}>
        <p className="section-title" style={{ marginBottom: 0 }}>Precificação</p>
      </div>
      <ProfitMultiplierField value={form.profit_multiplier} onChange={v => setForm(f => ({ ...f, profit_multiplier: v }))} error={errors.profit_multiplier?.[0]} />
      <p className="multiplier-hint" style={{ marginTop: 4 }}>Os custos de gás/energia/mão de obra já entram pela receita.</p>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={onCancel}>Cancelar</button>
        <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
          {saving ? 'Salvando...' : submitLabel}
        </button>
      </div>

      <QuickIngredientModal visible={quickIngredient} forceType="ingredient" onCreated={onIngredientCreated} onClose={() => setQuickIngredient(false)} />
      <QuickInsumoModal visible={quickInsumo} onCreated={onInsumoCreated} onClose={() => setQuickInsumo(false)} />
    </div>
  )
}
