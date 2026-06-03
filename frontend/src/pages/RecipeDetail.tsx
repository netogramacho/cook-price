import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Modal } from '../components/Modal'
import { FormField } from '../components/ui/FormField'
import { NumericInput } from '../components/ui/NumericInput'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AsyncState } from '../components/ui/AsyncState'
import { IngredientAutocomplete } from '../components/IngredientAutocomplete'
import { RecipeService } from '../services/RecipeService'
import type { Recipe, RecipeIngredient } from '../services/RecipeService'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { useAppStore } from '../store/useAppStore'
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

  const [editModal, setEditModal] = useState({ visible: false, loading: false, errors: {} as Record<string, string[]> })
  const [editForm, setEditForm] = useState({ name: '', description: '', yield: '', yield_unit: '', invisible_cost_pct: '', profit_multiplier: 3 })

  const [addModal, setAddModal] = useState({ visible: false, loading: false, errors: {} as Record<string, string[]>, available: [] as Ingredient[] })
  const [addForm, setAddForm] = useState({ ingredient_id: '', quantity: '' })

  const [editQtyModal, setEditQtyModal] = useState({ visible: false, loading: false, errors: {} as Record<string, string[]>, ingredient: null as RecipeIngredient | null })
  const [editQtyForm, setEditQtyForm] = useState({ quantity: '' })

  const [produceModal, setProduceModal] = useState({ visible: false, loading: false, errors: {} as Record<string, string[]>, hasStockWarning: false })
  const [produceTimes, setProduceTimes] = useState(1)

  const [confirm, setConfirm] = useState({ visible: false, loading: false, item: null as RecipeIngredient | null })

  const editModalMargin = (() => {
    const m = Number(editForm.profit_multiplier)
    if (!m || m <= 0) return '0,0'
    return ((1 - 1 / m) * 100).toFixed(1).replace('.', ',')
  })()

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
    setEditModal({ visible: true, loading: false, errors: {} })
  }

  async function saveRecipe() {
    setEditModal(m => ({ ...m, loading: true, errors: {} }))
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
      setEditModal(m => ({ ...m, visible: false }))
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      setEditModal(m => ({ ...m, errors: e.errors ?? {} }))
      if (!e.errors) error(e.message ?? 'Erro ao salvar receita.')
    } finally {
      setEditModal(m => ({ ...m, loading: false }))
    }
  }

  async function openAddIngredient() {
    let allIngredients: Ingredient[]
    try { allIngredients = await IngredientService.getAll() }
    catch { error('Erro ao carregar ingredientes.'); return }

    const currentIds = new Set((recipe?.ingredients as RecipeIngredient[] ?? []).map(i => i.ingredient_id ?? i.id))
    const available = allIngredients.filter(i => !currentIds.has(i.id))

    if (!available.length) { error('Todos os ingredientes já foram adicionados a esta receita.'); return }

    setAddModal({ visible: true, loading: false, errors: {}, available })
    setAddForm({ ingredient_id: '', quantity: '' })
  }

  async function addIngredient() {
    if (!addForm.ingredient_id) { setAddModal(m => ({ ...m, errors: { ingredient_id: ['Selecione um ingrediente.'] } })); return }
    if (!addForm.quantity || parseDecimal(addForm.quantity) <= 0) { setAddModal(m => ({ ...m, errors: { quantity: ['A quantidade deve ser maior que zero.'] } })); return }

    setAddModal(m => ({ ...m, loading: true, errors: {} }))
    try {
      const updated = await RecipeService.update(id!, { ingredients: buildIngredientsPayload({ add: { ingredient_id: addForm.ingredient_id, quantity: parseDecimal(addForm.quantity) } }) })
      setRecipe(updated as RecipeExt)
      success('Ingrediente adicionado.')
      setAddModal(m => ({ ...m, visible: false }))
    } catch (err: unknown) {
      if (!(err as { errors?: unknown }).errors) error((err as { message?: string }).message ?? 'Erro ao adicionar ingrediente.')
    } finally {
      setAddModal(m => ({ ...m, loading: false }))
    }
  }

  async function confirmRemove() {
    if (!confirm.item) return
    setConfirm(c => ({ ...c, loading: true }))
    try {
      const updated = await RecipeService.update(id!, { ingredients: buildIngredientsPayload({ removeId: confirm.item.id }) })
      setRecipe(updated as RecipeExt)
      success('Ingrediente removido.')
      setConfirm(c => ({ ...c, visible: false }))
    } catch (err: unknown) {
      error((err as { message?: string }).message ?? 'Erro ao remover ingrediente.')
    } finally {
      setConfirm(c => ({ ...c, loading: false }))
    }
  }

  function openEditQty(ingredient: RecipeIngredient) {
    setEditQtyModal({ visible: true, loading: false, errors: {}, ingredient })
    setEditQtyForm({ quantity: fmtQuantity(ingredient.quantity) })
  }

  async function saveIngredientQty() {
    if (!editQtyModal.ingredient) return
    setEditQtyModal(m => ({ ...m, loading: true, errors: {} }))
    try {
      const targetId = editQtyModal.ingredient.id
      const newQty = parseDecimal(editQtyForm.quantity)
      const ingredients = (recipe?.ingredients as RecipeIngredient[] ?? []).map(i => ({
        ingredient_id: i.ingredient_id ?? i.id,
        quantity: i.id === targetId ? newQty : parseFloat(String(i.quantity)),
      }))
      const updated = await RecipeService.update(id!, { ingredients })
      setRecipe(updated as RecipeExt)
      success('Quantidade atualizada.')
      setEditQtyModal(m => ({ ...m, visible: false }))
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      setEditQtyModal(m => ({ ...m, errors: e.errors ?? {} }))
      if (!e.errors) error(e.message ?? 'Erro ao atualizar quantidade.')
    } finally {
      setEditQtyModal(m => ({ ...m, loading: false }))
    }
  }

  async function produce() {
    setProduceModal(m => ({ ...m, loading: true, errors: {} }))
    try {
      await RecipeService.produce(id!, { times: Number(produceTimes) })
      success('Produção registrada com sucesso.')
      setProduceModal(m => ({ ...m, visible: false, hasStockWarning: false }))
      fetchRecipe()
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      setProduceModal(m => ({ ...m, errors: e.errors ?? {}, hasStockWarning: !!(e.errors as Record<string, unknown>)?.stock }))
      if (!e.errors) error(e.message ?? 'Erro ao registrar produção.')
    } finally {
      setProduceModal(m => ({ ...m, loading: false }))
    }
  }

  async function forceProduceAnyway() {
    setProduceModal(m => ({ ...m, loading: true }))
    try {
      await RecipeService.produce(id!, { times: Number(produceTimes), force: true })
      success('Produção registrada com sucesso.')
      setProduceModal(m => ({ ...m, visible: false, hasStockWarning: false }))
      fetchRecipe()
    } catch (err: unknown) {
      error((err as { message?: string }).message ?? 'Erro ao registrar produção.')
    } finally {
      setProduceModal(m => ({ ...m, loading: false }))
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
                    <button className="btn btn-primary" onClick={() => { setProduceModal({ visible: true, loading: false, errors: {}, hasStockWarning: false }); setProduceTimes(1) }}>Produzir</button>
                  </div>
                </div>

                <div className="cost-summary">
                  <div className="cost-item"><label>Ingredientes</label><strong>R$ {fmtCurrency(recipe.ingredients_cost)}</strong></div>
                  {Number(recipe.packaging_cost) > 0 && <div className="cost-item"><label>Embalagem</label><strong>R$ {fmtCurrency(recipe.packaging_cost)}</strong></div>}
                  {Number(recipe.invisible_cost_pct) > 0 && <div className="cost-item"><label>Custos Invisíveis ({String(recipe.invisible_cost_pct)}%)</label><strong>R$ {fmtCurrency(recipe.invisible_cost as number)}</strong></div>}
                  <div className="cost-item"><label>Custo de Produção</label><strong>R$ {fmtCurrency(recipe.production_cost as number)}</strong></div>
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
                            <td><span className={i.type === 'packaging' ? 'badge badge-packaging' : 'badge badge-ingredient'}>{i.type === 'packaging' ? 'Embalagem' : 'Ingrediente'}</span></td>
                            <td>{i.unit}</td>
                            <td>{fmtQuantity(i.quantity)}</td>
                            <td>R$ {fmtCurrency(i.subtotal)}</td>
                            <td>
                              <div className="td-actions">
                                <button className="btn btn-secondary btn-sm" onClick={() => openEditQty(i)}>Editar</button>
                                <button className="btn btn-danger btn-sm" onClick={() => setConfirm({ visible: true, loading: false, item: i })}>Remover</button>
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

      <Modal visible={editModal.visible} title="Editar Receita" loading={editModal.loading} onClose={() => setEditModal(m => ({ ...m, visible: false }))} onSubmit={saveRecipe}>
        <FormField label="Nome" error={editModal.errors.name?.[0]}>
          <input type="text" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
        </FormField>
        <div className="form-group">
          <label>Descrição (opcional)</label>
          <textarea rows={3} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <FormField label="Rendimento" error={editModal.errors.yield?.[0]}>
          <NumericInput value={editForm.yield} onChange={v => setEditForm(f => ({ ...f, yield: v }))} />
        </FormField>
        <FormField label="Unidade" error={editModal.errors.yield_unit?.[0]}>
          <input type="text" value={editForm.yield_unit} onChange={e => setEditForm(f => ({ ...f, yield_unit: e.target.value }))} />
        </FormField>
        <FormField label="Custos Invisíveis (%)" error={editModal.errors.invisible_cost_pct?.[0]}>
          <NumericInput value={editForm.invisible_cost_pct} placeholder="25" onChange={v => setEditForm(f => ({ ...f, invisible_cost_pct: v }))} />
        </FormField>
        <FormField label="Multiplicador de Lucro" error={editModal.errors.profit_multiplier?.[0]}>
          <div className="multiplier-control">
            <input type="range" min="1" max="6" step="0.25" value={editForm.profit_multiplier} onChange={e => setEditForm(f => ({ ...f, profit_multiplier: Number(e.target.value) }))} />
            <NumericInput className="multiplier-input" value={editForm.profit_multiplier} onChange={v => setEditForm(f => ({ ...f, profit_multiplier: Number(v) }))} />
            <span className="multiplier-suffix">x</span>
          </div>
          <p className="multiplier-hint">Margem de lucro: {editModalMargin}%</p>
        </FormField>
      </Modal>

      <Modal visible={addModal.visible} title="Adicionar Ingrediente" loading={addModal.loading} onClose={() => setAddModal(m => ({ ...m, visible: false }))} onSubmit={addIngredient}>
        <FormField label="Ingrediente" error={addModal.errors.ingredient_id?.[0]}>
          <IngredientAutocomplete value={addForm.ingredient_id} options={addModal.available} onChange={id => setAddForm(f => ({ ...f, ingredient_id: id }))} />
        </FormField>
        <FormField label="Quantidade" error={addModal.errors.quantity?.[0]}>
          <NumericInput value={addForm.quantity} placeholder="0.000" onChange={v => setAddForm(f => ({ ...f, quantity: v }))} />
        </FormField>
      </Modal>

      <Modal visible={editQtyModal.visible} title="Editar Quantidade" loading={editQtyModal.loading} submitText="Salvar" onClose={() => setEditQtyModal(m => ({ ...m, visible: false }))} onSubmit={saveIngredientQty}>
        <p className="step-hint">{editQtyModal.ingredient?.name} ({editQtyModal.ingredient?.unit})</p>
        <FormField label="Quantidade" error={editQtyModal.errors['ingredients.0.quantity']?.[0]}>
          <NumericInput value={editQtyForm.quantity} onChange={v => setEditQtyForm({ quantity: v })} />
        </FormField>
      </Modal>

      <Modal visible={produceModal.visible} title="Registrar Produção" loading={produceModal.loading} hideActions={produceModal.hasStockWarning} submitText="Produzir" onClose={() => setProduceModal(m => ({ ...m, visible: false }))} onSubmit={produce}>
        <p className="step-hint">O estoque dos ingredientes será deduzido conforme as quantidades da receita.</p>
        <div className="form-group">
          <label>Quantas vezes produzir?</label>
          <input type="number" min="1" step="1" value={produceTimes} onChange={e => setProduceTimes(Number(e.target.value))} />
        </div>
        {produceModal.hasStockWarning && (
          <div className="produce-warning">
            <p className="produce-warning-title">Estoque insuficiente para alguns ingredientes:</p>
            <ul className="produce-error-list">
              {((produceModal.errors as Record<string, string[]>).stock ?? []).map((msg: string) => <li key={msg}>{msg}</li>)}
            </ul>
            <p className="produce-warning-hint">Os ingredientes com falta de estoque serão zerados. Deseja continuar mesmo assim?</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setProduceModal(m => ({ ...m, visible: false }))}>Cancelar</button>
              <button type="button" className="btn btn-primary" disabled={produceModal.loading} onClick={forceProduceAnyway}>{produceModal.loading ? 'Salvando...' : 'Produzir mesmo assim'}</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal
        visible={confirm.visible}
        title="Remover Ingrediente"
        message={<>Remover <strong>{confirm.item?.name}</strong> desta receita?</>}
        loading={confirm.loading}
        confirmText="Remover"
        onConfirm={confirmRemove}
        onClose={() => setConfirm(c => ({ ...c, visible: false }))}
      />
    </div>
  )
}
