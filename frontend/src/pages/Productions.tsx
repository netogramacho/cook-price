import { useState, useEffect } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { FormField } from '../components/ui/FormField'
import { NumericInput } from '../components/ui/NumericInput'
import { ProductionService } from '../services/ProductionService'
import type { Production } from '../services/ProductionService'
import { RecipeService } from '../services/RecipeService'
import type { Recipe } from '../services/RecipeService'
import { useAppStore } from '../store/useAppStore'
import { useModal } from '../hooks/useModal'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { handleApiError } from '../utils/apiError'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'
import { parseDecimal } from '../utils/inputs'

interface ModalForm {
  recipe_id: string
  quantity_recipes: string
  notes: string
}

const emptyForm = (): ModalForm => ({ recipe_id: '', quantity_recipes: '', notes: '' })

function fmtDate(dateStr: string) {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function Productions() {
  const { success, error } = useAppStore()

  const [items, setItems] = useState<Production[]>([])
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null)

  const modal = useModal({ visible: false, loading: false, errors: {} as Record<string, string[]> })
  const [form, setForm] = useState<ModalForm>(emptyForm())

  const deleteProduction = useConfirmAction<Production>({
    onConfirm: async (item) => {
      await ProductionService.delete(item.id)
      success('Produção excluída.')
      setItems(prev => prev.filter(p => p.id !== item.id))
      setMeta(prev => ({ ...prev, total: prev.total - 1 }))
    },
    onError: error,
  })

  async function fetchPage(page: number, append = false) {
    try {
      const result = await ProductionService.getPaginated(page)
      setItems(prev => append ? [...prev, ...result.items] : result.items)
      setMeta(result.meta)
    } catch {
      setLoadError(true)
    }
  }

  useEffect(() => {
    fetchPage(1).finally(() => setLoading(false))
  }, [])

  async function loadMore() {
    if (loadingMore || meta.current_page >= meta.last_page) return
    setLoadingMore(true)
    await fetchPage(meta.current_page + 1, true).finally(() => setLoadingMore(false))
  }

  async function openCreate() {
    if (recipes.length === 0) {
      try {
        const all = await RecipeService.getAll()
        setRecipes(all)
      } catch {
        error('Erro ao carregar receitas.')
        return
      }
    }
    setForm(emptyForm())
    setSelectedRecipe(null)
    modal.open()
  }

  async function handleRecipeChange(recipe_id: string) {
    setForm(f => ({ ...f, recipe_id }))
    if (!recipe_id) { setSelectedRecipe(null); return }
    const recipe = recipes.find(r => r.id === recipe_id) ?? null
    setSelectedRecipe(recipe)
  }

  async function save() {
    modal.startSubmit()
    try {
      const production = await ProductionService.create({
        recipe_id: form.recipe_id,
        quantity_recipes: parseDecimal(form.quantity_recipes),
        notes: form.notes || undefined,
      })
      success('Produção registrada com sucesso.')
      modal.close()
      setItems(prev => [production, ...prev])
      setMeta(prev => ({ ...prev, total: prev.total + 1 }))
    } catch (err) {
      handleApiError(err, modal.setErrors, error, 'Erro ao registrar produção.')
    } finally {
      modal.setLoading(false)
    }
  }

  const qty = parseDecimal(form.quantity_recipes) || 0
  const previewYield  = selectedRecipe ? selectedRecipe.yield * qty : 0
  const previewCost   = selectedRecipe && selectedRecipe.production_cost ? selectedRecipe.production_cost * qty : 0
  const previewUnit   = previewYield > 0 ? previewCost / previewYield : 0
  const showPreview   = selectedRecipe && qty > 0

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <PageHeader title="Produções" actionLabel="+ Nova Produção" onAction={openCreate} />

          <AsyncState loading={loading} error={loadError ? 'Erro ao carregar produções.' : null}
            empty={!items.length} emptyEntityName="produção" emptySearch="">
            <div className="table-wrapper">
              <table className="ingredients-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Receita</th>
                    <th>Qtd</th>
                    <th>Rendimento</th>
                    <th>Custo Total</th>
                    <th>Custo Unit.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => (
                    <tr key={p.id}>
                      <td>{fmtDate(p.produced_at)}</td>
                      <td>{p.snapshot.recipe_name}</td>
                      <td>{fmtQuantity(p.quantity_recipes)}x</td>
                      <td>{fmtQuantity(p.total_yield)} {p.snapshot.yield_unit}</td>
                      <td>R$ {fmtCurrency(p.total_cost)}</td>
                      <td>R$ {fmtCurrency(p.unit_cost)}</td>
                      <td>
                        <div className="td-actions">
                          <button className="btn btn-danger btn-sm" onClick={() => deleteProduction.open(p)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <LoadMoreButton hasMore={meta.current_page < meta.last_page} loading={loadingMore} onLoadMore={loadMore} />
            </div>
          </AsyncState>
        </div>
      </main>

      <Modal
        visible={modal.state.visible}
        title="Nova Produção"
        loading={modal.state.loading}
        submitText="Registrar"
        onClose={modal.close}
        onSubmit={save}
      >
        <FormField label="Receita" error={modal.state.errors.recipe_id?.[0]}>
          <select value={form.recipe_id} onChange={e => handleRecipeChange(e.target.value)}>
            <option value="" disabled>Selecionar receita...</option>
            {recipes.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </FormField>

        <FormField label="Quantas vezes produziu?" error={modal.state.errors.quantity_recipes?.[0]}>
          <NumericInput value={form.quantity_recipes} placeholder="Ex: 2" onChange={v => setForm(f => ({ ...f, quantity_recipes: v }))} />
        </FormField>

        {showPreview && (
          <div className="cost-summary" style={{ marginTop: 8 }}>
            <div className="cost-item">
              <label>Rendimento total</label>
              <strong>{fmtQuantity(previewYield)} {selectedRecipe!.yield_unit}</strong>
            </div>
            <div className="cost-item">
              <label>Custo total</label>
              <strong>R$ {fmtCurrency(previewCost)}</strong>
            </div>
            <div className="cost-item">
              <label>Custo unitário</label>
              <strong>R$ {fmtCurrency(previewUnit)}</strong>
            </div>
          </div>
        )}

        <FormField label="Observações (opcional)" error={modal.state.errors.notes?.[0]}>
          <input
            type="text"
            value={form.notes}
            placeholder="Ex: Lote de natal"
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          />
        </FormField>
      </Modal>

      <ConfirmModal
        visible={deleteProduction.confirm.visible}
        title="Excluir Produção"
        message={<>Excluir a produção de <strong>{deleteProduction.confirm.item?.snapshot.recipe_name}</strong>? Esta ação não pode ser desfeita.</>}
        loading={deleteProduction.confirm.loading}
        confirmText="Excluir"
        onConfirm={deleteProduction.execute}
        onClose={deleteProduction.close}
      />
    </div>
  )
}
