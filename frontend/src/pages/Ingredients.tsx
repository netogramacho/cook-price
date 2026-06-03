import { useState, useEffect, useRef } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchBar } from '../components/ui/SearchBar'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { FormField } from '../components/ui/FormField'
import { NumericInput } from '../components/ui/NumericInput'
import { TypeSelectCards } from '../components/ui/TypeSelectCards'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { useAppStore } from '../store/useAppStore'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'
import { parseDecimal } from '../utils/inputs'

const TYPE_OPTIONS = [
  { value: 'ingredient', icon: '🥕', label: 'Ingrediente', description: 'Farinha, manteiga, ovos...' },
  { value: 'packaging',  icon: '📦', label: 'Embalagem',   description: 'Caixa, saco, etiqueta...' },
]

interface ModalForm {
  name: string; type: string; unit: string
  package_size: string; last_price: string; min_stock: string
}

const emptyForm = (): ModalForm => ({ name: '', type: '', unit: '', package_size: '', last_price: '', min_stock: '' })

export function Ingredients() {
  const { success, error } = useAppStore()

  const [items, setItems] = useState<Ingredient[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef('')

  const [modal, setModal] = useState({ visible: false, step: 'type-select' as 'type-select' | 'form', editing: null as Ingredient | null, loading: false, errors: {} as Record<string, string[]> })
  const [form, setForm] = useState<ModalForm>(emptyForm())

  const [confirm, setConfirm] = useState({ visible: false, loading: false, item: null as Ingredient | null })

  async function fetchIngredients(q = searchRef.current) {
    setLoading(true); setLoadError(false); setItems([]); setCurrentPage(1)
    try {
      const { items: data, meta } = await IngredientService.getPaginated(1, q.trim())
      setItems(data); setCurrentPage(meta.current_page); setHasMore(meta.current_page < meta.last_page)
    } catch { setLoadError(true) }
    finally { setLoading(false) }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { items: data, meta } = await IngredientService.getPaginated(currentPage + 1, searchRef.current.trim())
      setItems(prev => [...prev, ...data]); setCurrentPage(meta.current_page); setHasMore(meta.current_page < meta.last_page)
    } catch { error('Erro ao carregar mais ingredientes.') }
    finally { setLoadingMore(false) }
  }

  function handleSearch(q: string) {
    searchRef.current = q; setSearch(q); fetchIngredients(q)
  }

  useEffect(() => { fetchIngredients() }, [])

  function openCreate() {
    setModal({ visible: true, step: 'type-select', editing: null, loading: false, errors: {} })
    setForm(emptyForm())
  }

  function openEdit(ingredient: Ingredient) {
    setModal({ visible: true, step: 'form', editing: ingredient, loading: false, errors: {} })
    setForm({
      name: ingredient.name, type: ingredient.type, unit: ingredient.unit,
      package_size: String(ingredient.package_size),
      last_price: fmtCurrency(ingredient.last_price ?? ingredient.package_price),
      min_stock: (ingredient as unknown as Record<string, unknown>).min_stock
        ? fmtQuantity((ingredient as unknown as Record<string, unknown>).min_stock as number) : '',
    })
  }

  async function save() {
    setModal(m => ({ ...m, loading: true, errors: {} }))
    try {
      const payload = {
        ...form,
        package_size: parseDecimal(form.package_size),
        last_price: parseDecimal(form.last_price),
        min_stock: form.min_stock !== '' ? parseDecimal(form.min_stock) : null,
      }
      if (modal.editing) {
        await IngredientService.update(modal.editing.id, payload as unknown as Partial<Ingredient>)
        success('Ingrediente atualizado com sucesso.')
      } else {
        await IngredientService.create(payload as unknown as Partial<Ingredient>)
        success('Ingrediente criado com sucesso.')
      }
      setModal(m => ({ ...m, visible: false }))
      fetchIngredients()
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      setModal(m => ({ ...m, errors: e.errors ?? {} }))
      if (!e.errors) error(e.message ?? 'Erro ao salvar ingrediente.')
    } finally {
      setModal(m => ({ ...m, loading: false }))
    }
  }

  async function confirmDelete() {
    if (!confirm.item) return
    setConfirm(c => ({ ...c, loading: true }))
    try {
      await IngredientService.delete(confirm.item.id)
      success('Ingrediente excluído.')
      setConfirm(c => ({ ...c, visible: false }))
      fetchIngredients()
    } catch (err: unknown) {
      error((err as { message?: string }).message ?? 'Erro ao excluir ingrediente.')
    } finally {
      setConfirm(c => ({ ...c, loading: false }))
    }
  }

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <PageHeader title="Ingredientes" actionLabel="+ Novo Ingrediente" onAction={openCreate} />
          <SearchBar placeholder="Buscar ingrediente..." value={search} onChange={handleSearch} />

          <AsyncState loading={loading} error={loadError ? 'Erro ao carregar ingredientes.' : null}
            empty={!items.length} emptyEntityName="ingrediente" emptySearch={search}>
            <div className="table-wrapper">
              <table className="ingredients-table">
                <thead>
                  <tr>
                    <th>Nome</th><th>Tipo</th><th>Unidade</th><th>Tamanho do Pacote</th><th>Preço do Pacote</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(i => (
                    <tr key={i.id}>
                      <td>{i.name}</td>
                      <td><span className={i.type === 'packaging' ? 'badge badge-packaging' : 'badge badge-ingredient'}>{i.type === 'packaging' ? 'Embalagem' : 'Ingrediente'}</span></td>
                      <td>{i.unit}</td>
                      <td>{fmtQuantity(i.package_size)} {i.unit}</td>
                      <td>R$ {fmtCurrency(i.package_price)}</td>
                      <td>
                        <div className="td-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(i)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => setConfirm({ visible: true, loading: false, item: i })}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />
            </div>
          </AsyncState>
        </div>
      </main>

      <Modal
        visible={modal.visible}
        title={modal.editing ? 'Editar Ingrediente' : 'Novo Ingrediente'}
        loading={modal.loading}
        hideActions={modal.step === 'type-select'}
        onClose={() => setModal(m => ({ ...m, visible: false }))}
        onSubmit={save}
      >
        {modal.step === 'type-select' ? (
          <TypeSelectCards options={TYPE_OPTIONS} onSelect={type => { setForm(f => ({ ...f, type })); setModal(m => ({ ...m, step: 'form' })) }} />
        ) : (
          <>
            {!modal.editing && (
              <button type="button" className="btn-back" onClick={() => setModal(m => ({ ...m, step: 'type-select' }))}>← Voltar</button>
            )}
            <FormField label="Nome" error={modal.errors.name?.[0]}>
              <input type="text" value={form.name} placeholder="Ex: Farinha de trigo" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Unidade" error={modal.errors.unit?.[0]}>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="" disabled>Selecionar unidade...</option>
                <option value="g">g — Grama</option>
                <option value="ml">ml — Mililitro</option>
                <option value="un">un — Unidade</option>
              </select>
            </FormField>
            <FormField label="Tamanho do Pacote" error={modal.errors.package_size?.[0]}>
              <NumericInput value={form.package_size} placeholder="Ex: 500" onChange={v => setForm(f => ({ ...f, package_size: v }))} />
            </FormField>
            <FormField label="Preço do Pacote (R$)" error={modal.errors.last_price?.[0]}>
              <NumericInput value={form.last_price} placeholder="0.00" onChange={v => setForm(f => ({ ...f, last_price: v }))} />
            </FormField>
            <FormField label={`Estoque Mínimo (${form.unit || 'unidade'}) — opcional`} error={modal.errors.min_stock?.[0]}>
              <NumericInput value={form.min_stock} placeholder="Ex: 500" onChange={v => setForm(f => ({ ...f, min_stock: v }))} />
            </FormField>
          </>
        )}
      </Modal>

      <ConfirmModal
        visible={confirm.visible}
        title="Excluir Ingrediente"
        message={<>Excluir <strong>{confirm.item?.name}</strong>? Esta ação não pode ser desfeita.</>}
        loading={confirm.loading}
        confirmText="Excluir"
        onConfirm={confirmDelete}
        onClose={() => setConfirm(c => ({ ...c, visible: false }))}
      />
    </div>
  )
}
