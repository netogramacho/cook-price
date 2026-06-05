import { useState } from 'react'
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
import { TypeBadge } from '../components/ui/TypeBadge'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { useAppStore } from '../store/useAppStore'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useModal } from '../hooks/useModal'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { handleApiError } from '../utils/apiError'
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

type ModalStep = 'type-select' | 'form'

const emptyForm = (): ModalForm => ({ name: '', type: '', unit: '', package_size: '', last_price: '', min_stock: '' })

export function Ingredients() {
  const { success, error } = useAppStore()

  const { items, hasMore, loading, loadingMore, loadError, search, handleSearch, loadMore, refetch } =
    usePaginatedList({
      fetchFn: (page, q) => IngredientService.getPaginated(page, q),
      onError: error,
      loadMoreErrorMsg: 'Erro ao carregar mais ingredientes.',
    })

  const modal = useModal({
    visible: false,
    step: 'type-select' as ModalStep,
    editing: null as Ingredient | null,
    loading: false,
    errors: {} as Record<string, string[]>,
  })
  const [form, setForm] = useState<ModalForm>(emptyForm())

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
    modal.open({ step: 'type-select', editing: null })
  }

  function openEdit(ingredient: Ingredient) {
    setForm({
      name: ingredient.name, type: ingredient.type, unit: ingredient.unit,
      package_size: String(ingredient.package_size),
      last_price: fmtCurrency(ingredient.last_price ?? ingredient.package_price),
      min_stock: (ingredient as unknown as Record<string, unknown>).min_stock
        ? fmtQuantity((ingredient as unknown as Record<string, unknown>).min_stock as number) : '',
    })
    modal.open({ step: 'form', editing: ingredient })
  }

  async function save() {
    modal.startSubmit()
    try {
      const payload = {
        ...form,
        package_size: parseDecimal(form.package_size),
        last_price: parseDecimal(form.last_price),
        min_stock: form.min_stock !== '' ? parseDecimal(form.min_stock) : null,
      }
      if (modal.state.editing) {
        await IngredientService.update(modal.state.editing.id, payload as unknown as Partial<Ingredient>)
        success('Ingrediente atualizado com sucesso.')
      } else {
        await IngredientService.create(payload as unknown as Partial<Ingredient>)
        success('Ingrediente criado com sucesso.')
      }
      modal.close()
      refetch()
    } catch (err) {
      handleApiError(err, modal.setErrors, error, 'Erro ao salvar ingrediente.')
    } finally {
      modal.setLoading(false)
    }
  }

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <PageHeader title="Ingredientes" actionLabel="+ Novo Ingrediente" onAction={openCreate} />
          <SearchBar placeholder="Buscar ingrediente..." value={search} onChange={handleSearch} />

          <AsyncState loading={loading} error={loadError || null}
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
                      <td><TypeBadge type={i.type} /></td>
                      <td>{i.unit}</td>
                      <td>{fmtQuantity(i.package_size)} {i.unit}</td>
                      <td>R$ {fmtCurrency(i.package_price)}</td>
                      <td>
                        <div className="td-actions">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(i)}>Editar</button>
                          <button className="btn btn-danger btn-sm" onClick={() => deleteIngredient.open(i)}>Excluir</button>
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
        visible={modal.state.visible}
        title={modal.state.editing ? 'Editar Ingrediente' : 'Novo Ingrediente'}
        loading={modal.state.loading}
        hideActions={modal.state.step === 'type-select'}
        onClose={modal.close}
        onSubmit={save}
      >
        {modal.state.step === 'type-select' ? (
          <TypeSelectCards
            options={TYPE_OPTIONS}
            onSelect={type => { setForm(f => ({ ...f, type })); modal.patch({ step: 'form' }) }}
          />
        ) : (
          <>
            {!modal.state.editing && (
              <button type="button" className="btn-back" onClick={() => modal.patch({ step: 'type-select' })}>← Voltar</button>
            )}
            <FormField label="Nome" error={modal.state.errors.name?.[0]}>
              <input type="text" value={form.name} placeholder="Ex: Farinha de trigo" onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </FormField>
            <FormField label="Unidade" error={modal.state.errors.unit?.[0]}>
              <select value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                <option value="" disabled>Selecionar unidade...</option>
                <option value="g">g — Grama</option>
                <option value="ml">ml — Mililitro</option>
                <option value="un">un — Unidade</option>
              </select>
            </FormField>
            <FormField label="Tamanho do Pacote" error={modal.state.errors.package_size?.[0]}>
              <NumericInput value={form.package_size} placeholder="Ex: 500" onChange={v => setForm(f => ({ ...f, package_size: v }))} />
            </FormField>
            <FormField label="Preço do Pacote (R$)" error={modal.state.errors.last_price?.[0]}>
              <NumericInput value={form.last_price} placeholder="0.00" onChange={v => setForm(f => ({ ...f, last_price: v }))} />
            </FormField>
            <FormField label={`Estoque Mínimo (${form.unit || 'unidade'}) — opcional`} error={modal.state.errors.min_stock?.[0]}>
              <NumericInput value={form.min_stock} placeholder="Ex: 500" onChange={v => setForm(f => ({ ...f, min_stock: v }))} />
            </FormField>
          </>
        )}
      </Modal>

      <ConfirmModal
        visible={deleteIngredient.confirm.visible}
        title="Excluir Ingrediente"
        message={<>Excluir <strong>{deleteIngredient.confirm.item?.name}</strong>? Esta ação não pode ser desfeita.</>}
        loading={deleteIngredient.confirm.loading}
        confirmText="Excluir"
        onConfirm={deleteIngredient.execute}
        onClose={deleteIngredient.close}
      />
    </div>
  )
}
