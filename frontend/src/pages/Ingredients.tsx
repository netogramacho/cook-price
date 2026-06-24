import { useState } from 'react'
import { AppHeader } from '../components/AppHeader'
import { HintBanner } from '../components/ui/HintBanner'
import { useHintBanner } from '../hooks/useHintBanner'
import { SearchBar } from '../components/ui/SearchBar'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { FormField } from '../components/ui/FormField'
import { NumericInput } from '../components/ui/NumericInput'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { useAppStore } from '../store/useAppStore'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { handleApiError } from '../utils/apiError'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'
import { parseDecimal, capitalizeFirst } from '../utils/inputs'
import { INGREDIENT_UNITS, unitLabel } from '../utils/units'

interface IngredientForm {
  name: string; unit: string
  package_size: string; last_price: string
}

const emptyForm = (): IngredientForm => ({ name: '', unit: '', package_size: '', last_price: '' })

export function Ingredients() {
  const hint = useHintBanner()
  const { success, error } = useAppStore()

  const { items, hasMore, loading, loadingMore, loadError, search, handleSearch, loadMore, refetch } =
    usePaginatedList({
      fetchFn: (page, q) => IngredientService.getPaginated(page, q),
      onError: error,
      loadMoreErrorMsg: 'Erro ao carregar mais ingredientes.',
    })

  const [view, setView] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<Ingredient | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<IngredientForm>(emptyForm())

  const deleteIngredient = useConfirmAction<Ingredient>({
    onConfirm: async (item) => {
      await IngredientService.delete(item.id)
      success('Ingrediente excluído.')
      refetch()
    },
    onError: error,
  })

  function openCreate() {
    setForm(emptyForm())
    setEditing(null)
    setErrors({})
    setView('form')
  }

  function openEdit(ingredient: Ingredient) {
    setForm({
      name: ingredient.name, unit: ingredient.unit,
      package_size: fmtQuantity(ingredient.package_size),
      last_price: fmtCurrency(ingredient.last_price),
    })
    setEditing(ingredient)
    setErrors({})
    setView('form')
  }

  async function save() {
    setSaving(true)
    setErrors({})
    try {
      const payload = {
        ...form,
        package_size: parseDecimal(form.package_size),
        last_price: parseDecimal(form.last_price),
      }
      if (editing) {
        await IngredientService.update(editing.id, payload as unknown as Partial<Ingredient>)
        success('Ingrediente atualizado com sucesso.')
      } else {
        await IngredientService.create(payload as unknown as Partial<Ingredient>)
        success('Ingrediente criado com sucesso.')
      }
      setView('list')
      refetch()
    } catch (err) {
      handleApiError(err, setErrors, error, 'Erro ao salvar ingrediente.')
    } finally {
      setSaving(false)
    }
  }

  const formTitle = editing ? 'Editar Ingrediente' : 'Novo Ingrediente'

  // ---- View: formulário de criar/editar ----
  if (view === 'form') {
    return (
      <div className="app-layout">
        <AppHeader />
        <main className="app-main">
          <div className="container container-narrow">
            <button type="button" className="back-link" onClick={() => setView('list')}>← Voltar para Ingredientes</button>
            <h1 className="page-title">{formTitle}</h1>

            <div className="form-card">
              <FormField label="Nome do Ingrediente" error={errors.name?.[0]}>
                <input type="text" value={form.name}
                  placeholder="Ex: Farinha de trigo"
                  onChange={e => setForm(f => ({ ...f, name: capitalizeFirst(e.target.value) }))} />
              </FormField>

              <div className="field-grid">
                <FormField label="Unidade" error={errors.unit?.[0]}>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    <option value="" disabled>Selecionar...</option>
                    {INGREDIENT_UNITS.map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}
                  </select>
                </FormField>
                <FormField label="Tamanho do Pacote" error={errors.package_size?.[0]}>
                  <NumericInput value={form.package_size}
                    placeholder="Ex: 500"
                    onChange={v => setForm(f => ({ ...f, package_size: v }))} />
                </FormField>
              </div>

              <FormField label="Preço do Pacote (R$)" error={errors.last_price?.[0]}>
                <NumericInput value={form.last_price} placeholder="0,00" onChange={v => setForm(f => ({ ...f, last_price: v }))} />
              </FormField>

              {form.name && (
                <div className="preview-block">
                  <span className="preview-label">Pré-visualização</span>
                  <div className="entity-card entity-card--preview">
                    <span className="entity-avatar entity-avatar--ingredient">🥕</span>
                    <div className="entity-main">
                      <span className="entity-name">{form.name}</span>
                      <span className="entity-meta">
                        Ingrediente
                        {form.package_size && ` · ${form.package_size} ${form.unit}`}
                      </span>
                    </div>
                    {form.last_price && <span className="entity-value">R$ {fmtCurrency(parseDecimal(form.last_price))}</span>}
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => setView('list')}>Cancelar</button>
                <button type="button" className="btn btn-primary" disabled={saving} onClick={save}>
                  {saving ? 'Salvando...' : 'Salvar Ingrediente'}
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  // ---- View: listagem ----
  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <div className="list-header">
            <div className="list-header-title">
              <h1>Ingredientes</h1>
              {!!items.length && <span className="list-count">{items.length}</span>}
            </div>
            <button className="btn btn-primary" onClick={openCreate}>+ Novo Ingrediente</button>
          </div>

          <HintBanner hint={hint} />

          <div className="list-toolbar">
            <SearchBar placeholder="Buscar por nome..." value={search} onChange={handleSearch} />
          </div>

          <AsyncState loading={loading} error={loadError || null} onRetry={refetch}
            empty={!items.length} emptyEntityName="ingrediente" emptySearch={search}
            emptyAction={{ label: '+ Novo Ingrediente', onClick: openCreate }}>
            <div className="entity-list">
              {items.map(i => (
                <div key={i.id} className="entity-card">
                  <span className="entity-avatar entity-avatar--ingredient">🥕</span>
                  <div className="entity-main">
                    <span className="entity-name">{i.name}</span>
                    <span className="entity-meta">{fmtQuantity(i.package_size)} {i.unit}</span>
                  </div>
                  {Number(i.last_price) > 0
                    ? <span className="entity-value">R$ {fmtCurrency(i.last_price)}</span>
                    : <span className="tag-no-price">Sem preço</span>}
                  <div className="entity-actions">
                    <button className="icon-btn" title="Editar" onClick={() => openEdit(i)}>✏️</button>
                    <button className="icon-btn icon-btn--danger" title="Excluir" onClick={() => deleteIngredient.open(i)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
            <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />
          </AsyncState>
        </div>
      </main>

      <ConfirmModal
        visible={deleteIngredient.confirm.visible}
        title="Excluir ingrediente"
        message={<>Excluir <strong>{deleteIngredient.confirm.item?.name}</strong>? Esta ação não pode ser desfeita.</>}
        loading={deleteIngredient.confirm.loading}
        confirmText="Excluir"
        onConfirm={deleteIngredient.execute}
        onClose={deleteIngredient.close}
      />
    </div>
  )
}
