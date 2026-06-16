import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Modal } from '../components/Modal'
import { FormField } from '../components/ui/FormField'
import { NumericInput } from '../components/ui/NumericInput'
import { ProfitMultiplierField } from '../components/ui/ProfitMultiplierField'
import { InvisibleCostField } from '../components/ui/InvisibleCostField'
import { TypeBadge } from '../components/ui/TypeBadge'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AsyncState } from '../components/ui/AsyncState'
import { IngredientAutocomplete } from '../components/IngredientAutocomplete'
import { RecipeService } from '../services/RecipeService'
import type { Recipe, RecipeIngredient } from '../services/RecipeService'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { useAppStore } from '../store/useAppStore'
import { useModal } from '../hooks/useModal'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { handleApiError } from '../utils/apiError'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'
import { parseDecimal } from '../utils/inputs'

type RecipeExt = Recipe & Record<string, unknown>

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useAppStore()

  const [recipe, setRecipe] = useState<RecipeExt | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const editModal = useModal({ visible: false, loading: false, errors: {} as Record<string, string[]> })
  const [editForm, setEditForm] = useState({ name: '', description: '', yield: '', yield_unit: '', invisible_cost_pct: '', profit_multiplier: 3 })

  const addModal = useModal({ visible: false, loading: false, errors: {} as Record<string, string[]>, available: [] as Ingredient[] })
  const [addForm, setAddForm] = useState({ ingredient_id: '', quantity: '' })

  const editQtyModal = useModal({ visible: false, loading: false, errors: {} as Record<string, string[]>, ingredient: null as RecipeIngredient | null })
  const [editQtyForm, setEditQtyForm] = useState({ quantity: '' })


  const removeIngredient = useConfirmAction<RecipeIngredient>({
    onConfirm: async (item) => {
      const updated = await RecipeService.update(id!, { ingredients: buildIngredientsPayload({ removeId: item.id }) })
      setRecipe(updated as RecipeExt)
      success('Ingrediente removido.')
    },
    onError: error,
  })

  async function fetchRecipe() {
    setLoading(true); setLoadError(false)
    try { setRecipe(await RecipeService.getById(id!) as RecipeExt) }
    catch { setLoadError(true) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRecipe() }, [id])

  function buildIngredientsPayload(opts: { add?: { ingredient_id: string; quantity: number }; removeId?: string } = {}): { ingredient_id: string; quantity: number }[] {
    if (!recipe?.ingredients) return []
    const base = (recipe.ingredients as RecipeIngredient[])
      .filter(i => i.id !== opts.removeId)
      .map(i => ({ ingredient_id: i.ingredient_id ?? i.id, quantity: parseFloat(String(i.quantity)) }))
    return opts.add ? [...base, opts.add] : base
  }

  function openEdit() {
    if (!recipe) return
    setEditForm({
      name: recipe.name, description: String(recipe.description ?? ''),
      yield: String(recipe.yield), yield_unit: recipe.yield_unit,
      invisible_cost_pct: String(recipe.invisible_cost_pct ?? 25),
      profit_multiplier: Number(recipe.profit_multiplier ?? 3),
    })
    editModal.open()
  }

  async function saveRecipe() {
    editModal.startSubmit()
    try {
      const updated = await RecipeService.update(id!, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        yield: parseDecimal(editForm.yield),
        yield_unit: editForm.yield_unit.trim(),
        invisible_cost_pct: parseDecimal(String(editForm.invisible_cost_pct)),
        profit_multiplier: parseDecimal(String(editForm.profit_multiplier)),
      })
      setRecipe(updated as RecipeExt)
      success('Receita atualizada com sucesso.')
      editModal.close()
    } catch (err) {
      handleApiError(err, editModal.setErrors, error, 'Erro ao salvar receita.')
    } finally {
      editModal.setLoading(false)
    }
  }

  async function openAddIngredient() {
    let allIngredients: Ingredient[]
    try { allIngredients = await IngredientService.getAll() }
    catch { error('Erro ao carregar ingredientes.'); return }

    const currentIds = new Set((recipe?.ingredients as RecipeIngredient[] ?? []).map(i => i.ingredient_id ?? i.id))
    const available = allIngredients.filter(i => !currentIds.has(i.id))

    if (!available.length) { error('Todos os ingredientes já foram adicionados a esta receita.'); return }

    addModal.open({ available })
    setAddForm({ ingredient_id: '', quantity: '' })
  }

  async function addIngredient() {
    if (!addForm.ingredient_id) { addModal.setErrors({ ingredient_id: ['Selecione um ingrediente.'] }); return }
    if (!addForm.quantity || parseDecimal(addForm.quantity) <= 0) { addModal.setErrors({ quantity: ['A quantidade deve ser maior que zero.'] }); return }

    addModal.startSubmit()
    try {
      const updated = await RecipeService.update(id!, { ingredients: buildIngredientsPayload({ add: { ingredient_id: addForm.ingredient_id, quantity: parseDecimal(addForm.quantity) } }) })
      setRecipe(updated as RecipeExt)
      success('Ingrediente adicionado.')
      addModal.close()
    } catch (err) {
      handleApiError(err, addModal.setErrors, error, 'Erro ao adicionar ingrediente.')
    } finally {
      addModal.setLoading(false)
    }
  }

  function openEditQty(ingredient: RecipeIngredient) {
    editQtyModal.open({ ingredient })
    setEditQtyForm({ quantity: fmtQuantity(ingredient.quantity) })
  }

  async function saveIngredientQty() {
    if (!editQtyModal.state.ingredient) return
    editQtyModal.startSubmit()
    try {
      const targetId = editQtyModal.state.ingredient.id
      const newQty = parseDecimal(editQtyForm.quantity)
      const ingredients = (recipe?.ingredients as RecipeIngredient[] ?? []).map(i => ({
        ingredient_id: i.ingredient_id ?? i.id,
        quantity: i.id === targetId ? newQty : parseFloat(String(i.quantity)),
      }))
      const updated = await RecipeService.update(id!, { ingredients })
      setRecipe(updated as RecipeExt)
      success('Quantidade atualizada.')
      editQtyModal.close()
    } catch (err) {
      handleApiError(err, editQtyModal.setErrors, error, 'Erro ao atualizar quantidade.')
    } finally {
      editQtyModal.setLoading(false)
    }
  }

  const ingredients = (recipe?.ingredients ?? []) as RecipeIngredient[]

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <a href="#" className="back-link" onClick={e => { e.preventDefault(); navigate('/recipes') }}>← Voltar para Receitas</a>

          <AsyncState loading={loading} error={loadError ? 'Receita não encontrada.' : null} empty={false}>
            {recipe && (
              <>
                <div className="recipe-detail-header">
                  <div>
                    <h1 className="recipe-detail-title">{recipe.name}</h1>
                    {recipe.description && <p className="recipe-detail-desc">{String(recipe.description)}</p>}
                    <p className="recipe-meta">Rendimento: {fmtCurrency(recipe.yield)} {recipe.yield_unit}</p>
                  </div>
                  <div className="recipe-header-actions">
                    <button className="btn btn-secondary" onClick={openEdit}>Editar</button>
                  </div>
                </div>

                <div className="cost-summary">
                  <div className="cost-item"><label>Ingredientes</label><strong>R$ {fmtCurrency(recipe.ingredients_cost)}</strong></div>
                  {Number(recipe.packaging_cost) > 0 && <div className="cost-item"><label>Embalagem</label><strong>R$ {fmtCurrency(recipe.packaging_cost)}</strong></div>}
                  {Number(recipe.invisible_cost_pct) > 0 && <div className="cost-item"><label>Custos Invisíveis ({String(recipe.invisible_cost_pct)}%)</label><strong>R$ {fmtCurrency(recipe.invisible_cost as number)}</strong></div>}
                  {recipe.production_cost != null && <div className="cost-item"><label>Custo de Produção</label><strong>R$ {fmtCurrency(recipe.production_cost as number)}</strong></div>}
                  {Number(recipe.profit_multiplier) > 1 ? (
                    <div className="cost-item cost-item-highlight">
                      <label>Preço Sugerido / {recipe.yield_unit} ({String(recipe.profit_multiplier)}x · margem {String(recipe.profit_margin_pct)}%)</label>
                      <strong>R$ {fmtCurrency(recipe.suggested_price_per_yield as number)}</strong>
                    </div>
                  ) : (
                    <div className="cost-item"><label>Por {recipe.yield_unit}</label><strong>R$ {fmtCurrency(recipe.cost_per_yield as number)}</strong></div>
                  )}
                </div>

                <div className="page-header">
                  <p className="section-title" style={{ marginBottom: 0 }}>Ingredientes</p>
                  <button className="btn btn-primary btn-sm" onClick={openAddIngredient}>+ Adicionar</button>
                </div>

                <div className="table-wrapper">
                  {ingredients.length === 0 ? (
                    <p className="empty-state">Nenhum ingrediente nesta receita.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr><th>Ingrediente</th><th>Tipo</th><th>Unidade</th><th>Quantidade</th><th>Subtotal</th><th></th></tr>
                      </thead>
                      <tbody>
                        {ingredients.map(i => (
                          <tr key={i.id}>
                            <td>{i.name}</td>
                            <td><TypeBadge type={i.type} /></td>
                            <td>{i.unit}</td>
                            <td>{fmtQuantity(i.quantity)}</td>
                            <td>R$ {fmtCurrency(i.subtotal)}</td>
                            <td>
                              <div className="td-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => openEditQty(i)}>Editar</button>
                                <button className="btn btn-danger btn-sm" onClick={() => removeIngredient.open(i)}>Remover</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </AsyncState>
        </div>
      </main>

      <Modal visible={editModal.state.visible} title="Editar Receita" loading={editModal.state.loading} onClose={editModal.close} onSubmit={saveRecipe}>
        <FormField label="Nome" error={editModal.state.errors.name?.[0]}>
          <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
        </FormField>
        <div className="form-group">
          <label>Descrição (opcional)</label>
          <textarea rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <FormField label="Rendimento" error={editModal.state.errors.yield?.[0]}>
          <NumericInput value={editForm.yield} onChange={v => setEditForm(f => ({ ...f, yield: v }))} />
        </FormField>
        <FormField label="Unidade" error={editModal.state.errors.yield_unit?.[0]}>
          <input type="text" value={editForm.yield_unit} onChange={e => setEditForm(f => ({ ...f, yield_unit: e.target.value }))} />
        </FormField>
        <InvisibleCostField
          value={editForm.invisible_cost_pct}
          onChange={v => setEditForm(f => ({ ...f, invisible_cost_pct: v }))}
          error={editModal.state.errors.invisible_cost_pct?.[0]}
        />
        <ProfitMultiplierField
          value={editForm.profit_multiplier}
          onChange={v => setEditForm(f => ({ ...f, profit_multiplier: v }))}
          error={editModal.state.errors.profit_multiplier?.[0]}
        />
      </Modal>

      <Modal visible={addModal.state.visible} title="Adicionar Ingrediente" loading={addModal.state.loading} onClose={addModal.close} onSubmit={addIngredient}>
        <FormField label="Ingrediente" error={addModal.state.errors.ingredient_id?.[0]}>
          <IngredientAutocomplete value={addForm.ingredient_id} options={addModal.state.available} onChange={id => setAddForm(f => ({ ...f, ingredient_id: id }))} />
        </FormField>
        <FormField label="Quantidade" error={addModal.state.errors.quantity?.[0]}>
          <NumericInput value={addForm.quantity} placeholder="0.000" onChange={v => setAddForm(f => ({ ...f, quantity: v }))} />
        </FormField>
      </Modal>

      <Modal visible={editQtyModal.state.visible} title="Editar Quantidade" loading={editQtyModal.state.loading} submitText="Salvar" onClose={editQtyModal.close} onSubmit={saveIngredientQty}>
        <p className="step-hint">{editQtyModal.state.ingredient?.name} ({editQtyModal.state.ingredient?.unit})</p>
        <FormField label="Quantidade" error={editQtyModal.state.errors['ingredients.0.quantity']?.[0]}>
          <NumericInput value={editQtyForm.quantity} onChange={v => setEditQtyForm({ quantity: v })} />
        </FormField>
      </Modal>

      <ConfirmModal
        visible={removeIngredient.confirm.visible}
        title="Remover Ingrediente"
        message={<>Remover <strong>{removeIngredient.confirm.item?.name}</strong> desta receita?</>}
        loading={removeIngredient.confirm.loading}
        confirmText="Remover"
        onConfirm={removeIngredient.execute}
        onClose={removeIngredient.close}
      />
    </div>
  )
}
