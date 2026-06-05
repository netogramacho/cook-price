import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchBar } from '../components/ui/SearchBar'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { FormField } from '../components/ui/FormField'
import { NumericInput } from '../components/ui/NumericInput'
import { IngredientAutocomplete } from '../components/IngredientAutocomplete'
import { QuickIngredientModal } from '../components/QuickIngredientModal'
import { RecipeService } from '../services/RecipeService'
import type { Recipe } from '../services/RecipeService'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { UserService } from '../services/UserService'
import { useAppStore } from '../store/useAppStore'
import { fmtCurrency } from '../utils/formatters'
import { parseDecimal } from '../utils/inputs'

type Step = 'recipe-data' | 'ingredients' | 'packaging'
interface IngredientRow { ingredient_id: string; quantity: string }
interface RecipeForm {
  name: string; description: string; yield: string; yield_unit: string
  invisible_cost_pct: number; profit_multiplier: number
}

export function Recipes() {
  const navigate = useNavigate()
  const { success, error } = useAppStore()

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef('')

  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
  const [availablePackaging, setAvailablePackaging] = useState<Ingredient[]>([])

  const [modal, setModal] = useState({ visible: false, step: 'recipe-data' as Step, loading: false, errors: {} as Record<string, string[]> })
  const [form, setForm] = useState<RecipeForm>({ name: '', description: '', yield: '', yield_unit: '', invisible_cost_pct: 25, profit_multiplier: 3 })
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([{ ingredient_id: '', quantity: '' }])
  const [packagingRows, setPackagingRows] = useState<IngredientRow[]>([])

  const [quickCreate, setQuickCreate] = useState({ visible: false, initialName: '', forceType: null as 'ingredient' | 'packaging' | null, targetIndex: -1, targetList: '' as 'ingredients' | 'packaging' })
  const [confirm, setConfirm] = useState({ visible: false, loading: false, item: null as Recipe | null })

  const modalMargin = (() => {
    const m = Number(form.profit_multiplier)
    if (!m || m <= 0) return '0,0'
    return ((1 - 1 / m) * 100).toFixed(1).replace('.', ',')
  })()

  async function fetchRecipes(q = searchRef.current) {
    setLoading(true); setLoadError(false); setRecipes([]); setCurrentPage(1)
    try {
      const { items, meta } = await RecipeService.getPaginated(1, q.trim())
      setRecipes(items); setCurrentPage(meta.current_page); setHasMore(meta.current_page < meta.last_page)
    } catch { setLoadError(true) }
    finally { setLoading(false) }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { items, meta } = await RecipeService.getPaginated(currentPage + 1, searchRef.current.trim())
      setRecipes(prev => [...prev, ...items]); setCurrentPage(meta.current_page); setHasMore(meta.current_page < meta.last_page)
    } catch { error('Erro ao carregar mais receitas.') }
    finally { setLoadingMore(false) }
  }

  function handleSearch(q: string) { searchRef.current = q; setSearch(q); fetchRecipes(q) }
  useEffect(() => { fetchRecipes() }, [])

  async function openCreateModal() {
    try {
      const [allIngredients, user] = await Promise.all([IngredientService.getAll(), UserService.get()])
      setAvailableIngredients(allIngredients.filter(i => i.type === 'ingredient'))
      setAvailablePackaging(allIngredients.filter(i => i.type === 'packaging'))
      setForm({ name: '', description: '', yield: '', yield_unit: '', invisible_cost_pct: Number((user as unknown as Record<string, unknown>).invisible_cost_pct ?? 25), profit_multiplier: Number(user.profit_multiplier ?? 3) })
    } catch { error('Erro ao carregar dados.'); return }
    setIngredientRows([{ ingredient_id: '', quantity: '' }])
    setPackagingRows([])
    setModal({ visible: true, step: 'recipe-data', loading: false, errors: {} })
  }

  function nextStep() {
    if (modal.step === 'recipe-data') {
      const errors: Record<string, string[]> = {}
      if (!form.name.trim()) errors.name = ['O nome é obrigatório.']
      if (!form.yield) errors.yield = ['O rendimento é obrigatório.']
      if (!form.yield_unit.trim()) errors.yield_unit = ['A unidade é obrigatória.']
      if (Object.keys(errors).length) { setModal(m => ({ ...m, errors })); return }
      setModal(m => ({ ...m, step: 'ingredients', errors: {} }))
    } else if (modal.step === 'ingredients') {
      setModal(m => ({ ...m, step: 'packaging' }))
    }
  }

  function prevStep() {
    setModal(m => ({ ...m, step: m.step === 'packaging' ? 'ingredients' : 'recipe-data' }))
  }

  function updateRow(list: 'ingredients' | 'packaging', index: number, field: keyof IngredientRow, value: string) {
    const setter = list === 'ingredients' ? setIngredientRows : setPackagingRows
    setter(rows => rows.map((r, i) => i === index ? { ...r, [field]: value } : r))
  }

  function removeRow(list: 'ingredients' | 'packaging', index: number) {
    const setter = list === 'ingredients' ? setIngredientRows : setPackagingRows
    setter(rows => rows.filter((_, i) => i !== index))
  }

  async function saveRecipe() {
    setModal(m => ({ ...m, loading: true, errors: {} }))
    const ingredients = [...ingredientRows, ...packagingRows]
      .filter(r => r.ingredient_id && r.quantity)
      .map(r => ({ ingredient_id: r.ingredient_id, quantity: parseDecimal(r.quantity) }))
    try {
      await RecipeService.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        yield: parseDecimal(form.yield),
        yield_unit: form.yield_unit.trim(),
        invisible_cost_pct: parseDecimal(String(form.invisible_cost_pct)),
        profit_multiplier: parseDecimal(String(form.profit_multiplier)),
        ingredients,
      })
      success('Receita criada com sucesso.')
      setModal(m => ({ ...m, visible: false }))
      fetchRecipes()
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      setModal(m => ({ ...m, errors: e.errors ?? {} }))
      if (!e.errors) error(e.message ?? 'Erro ao salvar receita.')
    } finally {
      setModal(m => ({ ...m, loading: false }))
    }
  }

  function onQuickCreated(ingredient: Ingredient) {
    if (ingredient.type === 'ingredient') {
      setAvailableIngredients(prev => [...prev, ingredient])
    } else {
      setAvailablePackaging(prev => [...prev, ingredient])
    }
    const setter = quickCreate.targetList === 'ingredients' ? setIngredientRows : setPackagingRows
    setter(rows => rows.map((r, i) => i === quickCreate.targetIndex ? { ...r, ingredient_id: ingredient.id } : r))
    setQuickCreate(q => ({ ...q, visible: false }))
  }

  async function confirmDelete() {
    if (!confirm.item) return
    setConfirm(c => ({ ...c, loading: true }))
    try {
      await RecipeService.delete(confirm.item.id)
      success('Receita excluída.')
      setConfirm(c => ({ ...c, visible: false }))
      fetchRecipes()
    } catch (err: unknown) {
      error((err as { message?: string }).message ?? 'Erro ao excluir receita.')
    } finally {
      setConfirm(c => ({ ...c, loading: false }))
    }
  }

  const modalTitle = modal.step === 'recipe-data' ? 'Nova Receita — Dados' : modal.step === 'ingredients' ? 'Nova Receita — Ingredientes' : 'Nova Receita — Embalagens'

  function renderIngredientRows(list: 'ingredients' | 'packaging', rows: IngredientRow[], options: Ingredient[]) {
    return (
      <div className="ingredient-rows">
        {rows.map((row, index) => (
          <div key={index} className="ingredient-row">
            <IngredientAutocomplete
              value={row.ingredient_id}
              options={options}
              allowCreate
              onChange={id => updateRow(list, index, 'ingredient_id', id)}
              onCreate={name => setQuickCreate({ visible: true, initialName: name, forceType: list === 'ingredients' ? 'ingredient' : 'packaging', targetIndex: index, targetList: list })}
            />
            <NumericInput value={row.quantity} placeholder="Qtd" onChange={v => updateRow(list, index, 'quantity', v)} />
            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeRow(list, index)}>×</button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <PageHeader title="Receitas" actionLabel="+ Nova Receita" onAction={openCreateModal} />
          <SearchBar placeholder="Buscar receita..." value={search} onChange={handleSearch} />

          <AsyncState loading={loading} error={loadError ? 'Erro ao carregar receitas.' : null}
            empty={!recipes.length} emptyEntityName="receita" emptySearch={search}>
            <>
              {recipes.map(r => (
                <div key={r.id} className="recipe-card">
                  <div className="recipe-info">
                    <strong>{r.name}</strong>
                    <span>
                      Custo total: R$ {fmtCurrency(r.total_cost)}
                      &nbsp;·&nbsp;Por {r.yield_unit}: R$ {fmtCurrency((r as unknown as Record<string, unknown>).cost_per_yield as number)}
                      {(r as unknown as Record<string, unknown>).suggested_price_per_yield != null && (
                        <>&nbsp;·&nbsp;Preço sugerido/{r.yield_unit}: R$ {fmtCurrency((r as unknown as Record<string, unknown>).suggested_price_per_yield as number)}</>
                      )}
                    </span>
                  </div>
                  <div className="recipe-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/recipes/${r.id}`)}>Ver</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirm({ visible: true, loading: false, item: r })}>Excluir</button>
                  </div>
                </div>
              ))}
              <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />
            </>
          </AsyncState>
        </div>
      </main>

      <Modal visible={modal.visible} title={modalTitle} hideActions onClose={() => setModal(m => ({ ...m, visible: false }))}>
        {modal.step === 'recipe-data' && (
          <>
            <FormField label="Nome da Receita" error={modal.errors.name?.[0]}>
              <input type="text" value={form.name} placeholder="Ex: Bolo de chocolate" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
            <div className="form-group">
              <label>Descrição (opcional)</label>
              <textarea rows={2} value={form.description} placeholder="Descreva a receita..." onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-row">
              <FormField label="Rendimento" error={modal.errors.yield?.[0]}>
                <NumericInput value={form.yield} placeholder="10" onChange={v => setForm(f => ({ ...f, yield: v }))} />
              </FormField>
              <FormField label="Unidade" error={modal.errors.yield_unit?.[0]}>
                <input type="text" value={form.yield_unit} placeholder="porções" onChange={e => setForm(f => ({ ...f, yield_unit: e.target.value }))} />
              </FormField>
            </div>
            <FormField label="Custos Invisíveis (%)" error={modal.errors.invisible_cost_pct?.[0]}>
              <NumericInput value={form.invisible_cost_pct} placeholder="25" onChange={v => setForm(f => ({ ...f, invisible_cost_pct: Number(v) }))} />
            </FormField>
            <FormField label="Multiplicador de Lucro" error={modal.errors.profit_multiplier?.[0]}>
              <div className="multiplier-control">
                <input type="range" min="1" max="6" step="0.25" value={form.profit_multiplier} onChange={e => setForm(f => ({ ...f, profit_multiplier: Number(e.target.value) }))} />
                <NumericInput className="multiplier-input" value={form.profit_multiplier} onChange={v => setForm(f => ({ ...f, profit_multiplier: Number(v) }))} />
                <span className="multiplier-suffix">x</span>
              </div>
              <p className="multiplier-hint">Margem de lucro: {modalMargin}%</p>
            </FormField>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setModal(m => ({ ...m, visible: false }))}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={nextStep}>Próximo →</button>
            </div>
          </>
        )}
        {modal.step === 'ingredients' && (
          <>
            <p className="step-hint">Adicione os ingredientes utilizados na receita. Embalagens serão adicionadas na próxima etapa.</p>
            <span className="field-error">{modal.errors.ingredients?.[0] ?? ''}</span>
            {renderIngredientRows('ingredients', ingredientRows, availableIngredients)}
            <button type="button" className="btn btn-secondary btn-sm mt-8" onClick={() => setIngredientRows(r => [...r, { ingredient_id: '', quantity: '' }])}>+ Adicionar Ingrediente</button>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={prevStep}>← Voltar</button>
              <button type="button" className="btn btn-primary" onClick={nextStep}>Próximo →</button>
            </div>
          </>
        )}
        {modal.step === 'packaging' && (
          <>
            <p className="step-hint">Adicione as embalagens utilizadas na receita (opcional).</p>
            {renderIngredientRows('packaging', packagingRows, availablePackaging)}
            <button type="button" className="btn btn-secondary btn-sm mt-8" onClick={() => setPackagingRows(r => [...r, { ingredient_id: '', quantity: '' }])}>+ Adicionar Embalagem</button>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={prevStep}>← Voltar</button>
              <button type="button" className="btn btn-primary" disabled={modal.loading} onClick={saveRecipe}>{modal.loading ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </>
        )}
      </Modal>

      <QuickIngredientModal
        visible={quickCreate.visible}
        initialName={quickCreate.initialName}
        forceType={quickCreate.forceType}
        onCreated={onQuickCreated}
        onClose={() => setQuickCreate(q => ({ ...q, visible: false }))}
      />

      <ConfirmModal
        visible={confirm.visible}
        title="Excluir Receita"
        message={<>Excluir <strong>{confirm.item?.name}</strong>? Esta ação não pode ser desfeita.</>}
        loading={confirm.loading}
        confirmText="Excluir"
        onConfirm={confirmDelete}
        onClose={() => setConfirm(c => ({ ...c, visible: false }))}
      />
    </div>
  )
}
