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
import { InsumoService } from '../services/InsumoService'
import type { Insumo } from '../services/InsumoService'
import { useAppStore } from '../store/useAppStore'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { handleApiError } from '../utils/apiError'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'
import { parseDecimal, capitalizeFirst } from '../utils/inputs'
import { INGREDIENT_UNITS, unitLabel } from '../utils/units'

interface InsumoForm {
  name: string; unit: string
  package_size: string; last_price: string
}

const emptyForm = (): InsumoForm => ({ name: '', unit: 'un', package_size: '1', last_price: '' })

export function Insumos() {
  const hint = useHintBanner()
  const { success, error } = useAppStore()

  const { items, hasMore, loading, loadingMore, loadError, search, handleSearch, loadMore, refetch } =
    usePaginatedList({
      fetchFn: (page, q) => InsumoService.getPaginated(page, q),
      onError: error,
      loadMoreErrorMsg: 'Erro ao carregar mais insumos.',
    })

  const [view, setView] = useState<'list' | 'form'>('list')
  const [editing, setEditing] = useState<Insumo | null>(null)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<InsumoForm>(emptyForm())

  const deleteInsumo = useConfirmAction<Insumo>({
    onConfirm: async (item) => {
      await InsumoService.delete(item.id)
      success('Insumo excluído.')
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

  function openEdit(insumo: Insumo) {
    setForm({
      name: insumo.name, unit: insumo.unit,
      package_size: fmtQuantity(insumo.package_size),
      last_price: fmtCurrency(insumo.last_price),
    })
    setEditing(insumo)
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
        await InsumoService.update(editing.id, payload as unknown as Partial<Insumo>)
        success('Insumo atualizado com sucesso.')
      } else {
        await InsumoService.create(payload as unknown as Partial<Insumo>)
        success('Insumo criado com sucesso.')
      }
      setView('list')
      refetch()
    } catch (err) {
      handleApiError(err, setErrors, error, 'Erro ao salvar insumo.')
    } finally {
      setSaving(false)
    }
  }

  const formTitle = editing ? 'Editar Insumo' : 'Novo Insumo'

  // ---- View: formulário de criar/editar ----
  if (view === 'form') {
    return (
      <div className="app-layout">
        <AppHeader />
        <main className="app-main">
          <div className="container container-narrow">
            <button type="button" className="back-link" onClick={() => setView('list')}>← Voltar para Insumos</button>
            <h1 className="page-title">{formTitle}</h1>

            <div className="form-card">
              <p className="settings-hint">Insumos acompanham o produto na venda: caixas, sacos, etiquetas, fitas...</p>

              <FormField label="Nome do Insumo" error={errors.name?.[0]}>
                <input type="text" value={form.name}
                  placeholder="Ex: Caixa kraft 6 doces"
                  onChange={e => setForm(f => ({ ...f, name: capitalizeFirst(e.target.value) }))} />
              </FormField>

              <div className="field-grid">
                <FormField label="Unidade" error={errors.unit?.[0]}>
                  <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    {INGREDIENT_UNITS.map(u => <option key={u} value={u}>{unitLabel(u)}</option>)}
                  </select>
                </FormField>
                <FormField label="Qtd no Pacote" error={errors.package_size?.[0]}>
                  <NumericInput value={form.package_size}
                    placeholder="Ex: 1"
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
                    <span className="entity-avatar entity-avatar--packaging">📦</span>
                    <div className="entity-main">
                      <span className="entity-name">{form.name}</span>
                      <span className="entity-meta">
                        Insumo
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
                  {saving ? 'Salvando...' : 'Salvar Insumo'}
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
              <h1>Insumos</h1>
              {!!items.length && <span className="list-count">{items.length}</span>}
            </div>
            <button className="btn btn-primary" onClick={openCreate}>+ Novo Insumo</button>
          </div>

          <HintBanner hint={hint} />

          <div className="list-toolbar">
            <SearchBar placeholder="Buscar por nome..." value={search} onChange={handleSearch} />
          </div>

          <AsyncState loading={loading} error={loadError || null} onRetry={refetch}
            empty={!items.length} emptyEntityName="insumo" emptySearch={search}
            emptyAction={{ label: '+ Novo Insumo', onClick: openCreate }}>
            <div className="entity-list">
              {items.map(i => (
                <div key={i.id} className="entity-card">
                  <span className="entity-avatar entity-avatar--packaging">📦</span>
                  <div className="entity-main">
                    <span className="entity-name">{i.name}</span>
                    <span className="entity-meta">{fmtQuantity(i.package_size)} {i.unit}</span>
                  </div>
                  {Number(i.last_price) > 0
                    ? <span className="entity-value">R$ {fmtCurrency(i.last_price)}</span>
                    : <span className="tag-no-price">Sem preço</span>}
                  <div className="entity-actions">
                    <button className="icon-btn" title="Editar" onClick={() => openEdit(i)}>✏️</button>
                    <button className="icon-btn icon-btn--danger" title="Excluir" onClick={() => deleteInsumo.open(i)}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
            <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />
          </AsyncState>
        </div>
      </main>

      <ConfirmModal
        visible={deleteInsumo.confirm.visible}
        title="Excluir insumo"
        message={<>Excluir <strong>{deleteInsumo.confirm.item?.name}</strong>? Esta ação não pode ser desfeita.</>}
        loading={deleteInsumo.confirm.loading}
        confirmText="Excluir"
        onConfirm={deleteInsumo.execute}
        onClose={deleteInsumo.close}
      />
    </div>
  )
}
