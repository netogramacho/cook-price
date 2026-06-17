import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { HintBanner } from '../components/ui/HintBanner'
import { useHintBanner } from '../hooks/useHintBanner'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchBar } from '../components/ui/SearchBar'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { FormField } from '../components/ui/FormField'
import { NumericInput } from '../components/ui/NumericInput'
import { ProfitMultiplierField } from '../components/ui/ProfitMultiplierField'
import { InvisibleCostField } from '../components/ui/InvisibleCostField'
import { IngredientAutocomplete } from '../components/IngredientAutocomplete'
import { QuickIngredientModal } from '../components/QuickIngredientModal'
import { ProduceModal } from '../components/ProduceModal'
import { RecipeService } from '../services/RecipeService'
import type { Recipe } from '../services/RecipeService'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { UserService } from '../services/UserService'
import { useAppStore } from '../store/useAppStore'
import { triggerPlanUpgrade } from '../lib/api'
import { getUser } from '../lib/auth'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useModal } from '../hooks/useModal'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { handleApiError } from '../utils/apiError'
import { fmtCurrency } from '../utils/formatters'
import { parseDecimal } from '../utils/inputs'

type Step = 'recipe-data' | 'ingredients' | 'packaging'
interface IngredientRow { ingredient_id: string; quantity: string }
interface RecipeForm {
  name: string; description: string; yield: string; yield_unit: string
  invisible_cost_pct: number; profit_multiplier: number
}

export function Recipes() {
  const hint = useHintBanner()
  const navigate = useNavigate()
  const { success, error } = useAppStore()

  const { items: recipes, hasMore, loading, loadingMore, loadError, search, handleSearch, loadMore, refetch } =
    usePaginatedList({
      fetchFn: (page, q) => RecipeService.getPaginated(page, q),
      onError: error,
      loadMoreErrorMsg: 'Erro ao carregar mais receitas.',
    })

  const [availableIngredients, setAvailableIngredients] = useState<Ingredient[]>([])
  const [availablePackaging, setAvailablePackaging] = useState<Ingredient[]>([])

  const modal = useModal({ visible: false, step: 'recipe-data' as Step, loading: false, errors: {} as Record<string, string[]> })
  const [form, setForm] = useState<RecipeForm>({ name: '', description: '', yield: '', yield_unit: '', invisible_cost_pct: 25, profit_multiplier: 3 })
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>([{ ingredient_id: '', quantity: '' }])
  const [packagingRows, setPackagingRows] = useState<IngredientRow[]>([])

  const [quickCreate, setQuickCreate] = useState({ visible: false, initialName: '', forceType: null as 'ingredient' | 'packaging' | null, targetIndex: -1, targetList: '' as 'ingredients' | 'packaging' })

  const hasProd = !!getUser()?.plan.has_production
  const [produceRecipe, setProduceRecipe] = useState<Recipe | null>(null)

  const deleteRecipe = useConfirmAction<Recipe>({
    onConfirm: async (item) => {
      await RecipeService.delete(item.id)
      success('Receita excluída.')
      refetch()
    },
    onError: error,
  })

  async function handleDuplicate(id: string) {
    try {
      const copy = await RecipeService.duplicate(id)
      success(`"${copy.name}" criada.`)
      refetch()
    } catch {
      error('Erro ao duplicar receita.')
    }
  }

  async function openCreateModal() {
    try {
      const [allIngredients, user] = await Promise.all([IngredientService.getAll(), UserService.get()])
      setAvailableIngredients(allIngredients.filter(i => i.type === 'ingredient'))
      setAvailablePackaging(allIngredients.filter(i => i.type === 'packaging'))
      setForm({ name: '', description: '', yield: '', yield_unit: '', invisible_cost_pct: Number((user as unknown as Record<string, unknown>).invisible_cost_pct ?? 25), profit_multiplier: Number(user.profit_multiplier ?? 3) })
    } catch { error('Erro ao carregar dados.'); return }
    setIngredientRows([{ ingredient_id: '', quantity: '' }])
    setPackagingRows([])
    modal.open({ step: 'recipe-data' })
  }

  function nextStep() {
    if (modal.state.step === 'recipe-data') {
      const errors: Record<string, string[]> = {}
      if (!form.name.trim()) errors.name = ['O nome é obrigatório.']
      if (!form.yield) errors.yield = ['O rendimento é obrigatório.']
      if (!form.yield_unit.trim()) errors.yield_unit = ['A unidade é obrigatória.']
      if (Object.keys(errors).length) { modal.setErrors(errors); return }
      modal.patch({ step: 'ingredients', errors: {} })
    } else if (modal.state.step === 'ingredients') {
      modal.patch({ step: 'packaging' })
    }
  }

  function prevStep() {
    modal.patch({ step: modal.state.step === 'packaging' ? 'ingredients' : 'recipe-data' })
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
    modal.startSubmit()
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
      modal.close()
      refetch()
    } catch (err) {
      handleApiError(err, modal.setErrors, error, 'Erro ao salvar receita.')
    } finally {
      modal.setLoading(false)
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

  const modalTitle = modal.state.step === 'recipe-data'
    ? 'Nova Receita — Dados'
    : modal.state.step === 'ingredients'
      ? 'Nova Receita — Ingredientes'
      : 'Nova Receita — Embalagens'

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
          <HintBanner hint={hint} />

          <AsyncState loading={loading} error={loadError || null}
            empty={!recipes.length} emptyEntityName="receita" emptySearch={search}
            emptyAction={{ label: '+ Nova Receita', onClick: openCreateModal }}>
            <>
              {recipes.map(r => (
                <div key={r.id} className="recipe-card">
                  <div className="recipe-info">
                    <strong>{r.name}</strong>
                    <span>
                      Custo base: R$ {fmtCurrency(r.base_cost)}
                      {(r as unknown as Record<string, unknown>).cost_per_yield != null && (
                        <>&nbsp;·&nbsp;Por {r.yield_unit}: R$ {fmtCurrency((r as unknown as Record<string, unknown>).cost_per_yield as number)}</>
                      )}
                      {(r as unknown as Record<string, unknown>).suggested_price_per_yield != null && (
                        <>&nbsp;·&nbsp;Preço sugerido/{r.yield_unit}: R$ {fmtCurrency((r as unknown as Record<string, unknown>).suggested_price_per_yield as number)}</>
                      )}
                    </span>
                  </div>
                  <div className="recipe-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => hasProd ? setProduceRecipe(r) : triggerPlanUpgrade('O registro de produções está disponível nos planos pagos.')}>{hasProd ? 'Produzir' : '🔒 Produzir'}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/recipes/${r.id}`)}>Ver</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleDuplicate(r.id)}>Duplicar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteRecipe.open(r)}>Excluir</button>
                  </div>
                </div>
              ))}
              <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />
            </>
          </AsyncState>
        </div>
      </main>

      <Modal visible={modal.state.visible} title={modalTitle} hideActions onClose={modal.close}>
        {modal.state.step === 'recipe-data' && (
          <>
            <FormField label="Nome da Receita" error={modal.state.errors.name?.[0]}>
              <input type="text" value={form.name} placeholder="Ex: Bolo de chocolate" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
            <div className="form-group">
              <label>Descrição (opcional)</label>
              <textarea rows={2} value={form.description} placeholder="Descreva a receita..." onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-row">
              <FormField label="Rendimento" error={modal.state.errors.yield?.[0]}>
                <NumericInput value={form.yield} placeholder="10" onChange={v => setForm(f => ({ ...f, yield: v }))} />
              </FormField>
              <FormField label="Unidade" error={modal.state.errors.yield_unit?.[0]}>
                <input type="text" value={form.yield_unit} placeholder="porções" onChange={e => setForm(f => ({ ...f, yield_unit: e.target.value }))} />
              </FormField>
            </div>
            <InvisibleCostField
              value={form.invisible_cost_pct}
              onChange={v => setForm(f => ({ ...f, invisible_cost_pct: Number(v) }))}
              error={modal.state.errors.invisible_cost_pct?.[0]}
              locked={!getUser()?.plan.has_pricing}
              onLockedClick={() => triggerPlanUpgrade('A precificação avançada está disponível nos planos pagos.')}
            />
            <ProfitMultiplierField
              value={form.profit_multiplier}
              onChange={v => setForm(f => ({ ...f, profit_multiplier: v }))}
              error={modal.state.errors.profit_multiplier?.[0]}
              locked={!getUser()?.plan.has_pricing}
              onLockedClick={() => triggerPlanUpgrade('A precificação avançada está disponível nos planos pagos.')}
            />
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={modal.close}>Cancelar</button>
              <button type="button" className="btn btn-primary" onClick={nextStep}>Próximo →</button>
            </div>
          </>
        )}
        {modal.state.step === 'ingredients' && (
          <>
            <p className="step-hint">Adicione os ingredientes utilizados na receita. Embalagens serão adicionadas na próxima etapa.</p>
            <span className="field-error">{modal.state.errors.ingredients?.[0] ?? ''}</span>
            {renderIngredientRows('ingredients', ingredientRows, availableIngredients)}
            <button type="button" className="btn btn-secondary btn-sm mt-8" onClick={() => setIngredientRows(r => [...r, { ingredient_id: '', quantity: '' }])}>+ Adicionar Ingrediente</button>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={prevStep}>← Voltar</button>
              <button type="button" className="btn btn-primary" onClick={nextStep}>Próximo →</button>
            </div>
          </>
        )}
        {modal.state.step === 'packaging' && (
          <>
            <p className="step-hint">Adicione as embalagens utilizadas na receita (opcional).</p>
            {renderIngredientRows('packaging', packagingRows, availablePackaging)}
            <button type="button" className="btn btn-secondary btn-sm mt-8" onClick={() => setPackagingRows(r => [...r, { ingredient_id: '', quantity: '' }])}>+ Adicionar Embalagem</button>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={prevStep}>← Voltar</button>
              <button type="button" className="btn btn-primary" disabled={modal.state.loading} onClick={saveRecipe}>
                {modal.state.loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </>
        )}
      </Modal>

      <ProduceModal
        recipe={produceRecipe}
        onClose={() => setProduceRecipe(null)}
        onSuccess={() => setProduceRecipe(null)}
      />

      <QuickIngredientModal
        visible={quickCreate.visible}
        initialName={quickCreate.initialName}
        forceType={quickCreate.forceType}
        onCreated={onQuickCreated}
        onClose={() => setQuickCreate(q => ({ ...q, visible: false }))}
      />

      <ConfirmModal
        visible={deleteRecipe.confirm.visible}
        title="Excluir Receita"
        message={<>Excluir <strong>{deleteRecipe.confirm.item?.name}</strong>? Esta ação não pode ser desfeita.</>}
        loading={deleteRecipe.confirm.loading}
        confirmText="Excluir"
        onConfirm={deleteRecipe.execute}
        onClose={deleteRecipe.close}
      />
    </div>
  )
}
