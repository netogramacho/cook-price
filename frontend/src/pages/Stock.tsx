import { useState, useEffect, useRef } from 'react'
import { AppHeader } from '../components/AppHeader'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchBar } from '../components/ui/SearchBar'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { FormField } from '../components/ui/FormField'
import { NumericInput } from '../components/ui/NumericInput'
import { IngredientAutocomplete } from '../components/IngredientAutocomplete'
import { QuickIngredientModal } from '../components/QuickIngredientModal'
import { StockService } from '../services/StockService'
import type { StockItem, Movement } from '../services/StockService'
import { IngredientService } from '../services/IngredientService'
import type { Ingredient } from '../services/IngredientService'
import { useAppStore } from '../store/useAppStore'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'
import { parseDecimal } from '../utils/inputs'

interface PurchaseRow { ingredient_id: string; package_size: string; num_packages: string; total_price: string }

export function Stock() {
  const { success, error } = useAppStore()

  const [items, setItems] = useState<StockItem[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadError, setLoadError] = useState<string | false>(false)
  const [search, setSearch] = useState('')
  const searchRef = useRef('')

  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([])

  const [purchaseModal, setPurchaseModal] = useState({ visible: false, loading: false, errors: {} as Record<string, string[]> })
  const [purchaseForm, setPurchaseForm] = useState({ purchased_at: '', notes: '' })
  const [purchaseRows, setPurchaseRows] = useState<PurchaseRow[]>([{ ingredient_id: '', package_size: '', num_packages: '', total_price: '' }])

  const [adjustModal, setAdjustModal] = useState({ visible: false, loading: false, errors: {} as Record<string, string[]>, ingredient: null as StockItem | null })
  const [adjustForm, setAdjustForm] = useState({ stock_quantity: '', min_stock: '', movement_date: '', notes: '' })

  const [historyModal, setHistoryModal] = useState({ visible: false, loading: false, ingredient: null as StockItem | null, movements: [] as Movement[], currentPage: 1, hasMore: false, loadingMore: false })

  const [quickCreate, setQuickCreate] = useState({ visible: false, initialName: '', forceType: null as null, targetIndex: -1 })

  async function fetchStock(q = searchRef.current) {
    setLoading(true); setLoadError(false); setItems([]); setCurrentPage(1)
    try {
      const { items: data, meta } = await StockService.getPaginated(1, q.trim())
      setItems(data); setCurrentPage(meta.current_page); setHasMore(meta.current_page < (meta.last_page ?? 1))
    } catch (err: unknown) {
      setLoadError((err as { message?: string }).message ?? 'Erro ao carregar estoque.')
    }
    finally { setLoading(false) }
  }

  async function loadMore() {
    setLoadingMore(true)
    try {
      const { items: data, meta } = await StockService.getPaginated(currentPage + 1, searchRef.current.trim())
      setItems(prev => [...prev, ...data]); setCurrentPage(meta.current_page); setHasMore(meta.current_page < (meta.last_page ?? 1))
    } catch { error('Erro ao carregar mais itens.') }
    finally { setLoadingMore(false) }
  }

  function handleSearch(q: string) { searchRef.current = q; setSearch(q); fetchStock(q) }
  useEffect(() => { fetchStock() }, [])

  function fmtRefPrice(item: StockItem) {
    if (!item.package_price || !item.package_size) return '—'
    return `R$ ${fmtCurrency(item.package_price)} / ${fmtQuantity(item.package_size)} ${item.unit}`
  }

  async function openPurchaseModal() {
    try { setAllIngredients(await IngredientService.getAll()) }
    catch { error('Erro ao carregar ingredientes.'); return }
    setPurchaseForm({ purchased_at: '', notes: '' })
    setPurchaseRows([{ ingredient_id: '', package_size: '', num_packages: '', total_price: '' }])
    setPurchaseModal({ visible: true, loading: false, errors: {} })
  }

  function onIngredientSelect(index: number, id: string) {
    const ing = allIngredients.find(i => i.id === id)
    setPurchaseRows(rows => rows.map((r, i) => i === index ? { ...r, ingredient_id: id, package_size: ing ? fmtQuantity(ing.package_size) : r.package_size } : r))
  }

  function pricePerPackage(row: PurchaseRow) {
    const pkgs = parseDecimal(row.num_packages)
    const total = parseDecimal(row.total_price)
    if (!pkgs || !total) return null
    return total / pkgs
  }

  const purchaseTotalValue = purchaseRows.reduce((sum, r) => sum + (parseDecimal(r.total_price) || 0), 0)

  async function savePurchase() {
    setPurchaseModal(m => ({ ...m, loading: true, errors: {} }))
    try {
      const purchaseItems = purchaseRows
        .filter(r => r.ingredient_id && r.package_size && r.num_packages && r.total_price)
        .map(r => ({ ingredient_id: r.ingredient_id, package_size: parseDecimal(r.package_size), num_packages: parseDecimal(r.num_packages), total_price: parseDecimal(r.total_price) }))
      await StockService.createPurchase({ purchased_at: purchaseForm.purchased_at || null, notes: purchaseForm.notes.trim() || null, items: purchaseItems })
      success('Compra registrada com sucesso.')
      setPurchaseModal(m => ({ ...m, visible: false }))
      fetchStock()
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      setPurchaseModal(m => ({ ...m, errors: e.errors ?? {} }))
      if (!e.errors) error(e.message ?? 'Erro ao registrar compra.')
    } finally {
      setPurchaseModal(m => ({ ...m, loading: false }))
    }
  }

  function onQuickCreated(ingredient: Ingredient) {
    setAllIngredients(prev => [...prev, ingredient])
    setPurchaseRows(rows => rows.map((r, i) => i === quickCreate.targetIndex ? { ...r, ingredient_id: ingredient.id, package_size: fmtQuantity(ingredient.package_size) } : r))
    setQuickCreate(q => ({ ...q, visible: false }))
  }

  function openAdjust(item: StockItem) {
    setAdjustModal({ visible: true, loading: false, errors: {}, ingredient: item })
    setAdjustForm({
      stock_quantity: fmtQuantity(item.stock_quantity),
      min_stock: (item as unknown as Record<string, unknown>).min_stock ? fmtQuantity((item as unknown as Record<string, unknown>).min_stock as number) : '',
      movement_date: new Date().toISOString().split('T')[0],
      notes: '',
    })
  }

  async function saveAdjust() {
    setAdjustModal(m => ({ ...m, loading: true, errors: {} }))
    try {
      const updated = await StockService.adjust(adjustModal.ingredient!.id, {
        stock_quantity: parseDecimal(adjustForm.stock_quantity),
        min_stock: adjustForm.min_stock !== '' ? parseDecimal(adjustForm.min_stock) : null,
        movement_date: adjustForm.movement_date || null,
        notes: adjustForm.notes.trim() || null,
      })
      success('Estoque ajustado com sucesso.')
      setAdjustModal(m => ({ ...m, visible: false }))
      setItems(prev => prev.map(i => i.id === adjustModal.ingredient!.id ? { ...i, ...(updated as Partial<StockItem>) } : i))
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      setAdjustModal(m => ({ ...m, errors: e.errors ?? {} }))
      if (!e.errors) error(e.message ?? 'Erro ao ajustar estoque.')
    } finally {
      setAdjustModal(m => ({ ...m, loading: false }))
    }
  }

  async function openHistory(item: StockItem) {
    setHistoryModal({ visible: true, loading: true, ingredient: item, movements: [], currentPage: 1, hasMore: false, loadingMore: false })
    try {
      const { items: mvs, meta } = await StockService.getMovements(item.id, 1)
      setHistoryModal(m => ({ ...m, loading: false, movements: mvs, currentPage: meta.current_page, hasMore: meta.current_page < (meta.last_page ?? 1) }))
    } catch (err: unknown) { error((err as { message?: string }).message ?? 'Erro ao carregar histórico.'); setHistoryModal(m => ({ ...m, loading: false })) }
  }

  async function loadMoreHistory() {
    if (!historyModal.ingredient) return
    setHistoryModal(m => ({ ...m, loadingMore: true }))
    try {
      const { items: mvs, meta } = await StockService.getMovements(historyModal.ingredient.id, historyModal.currentPage + 1)
      setHistoryModal(m => ({ ...m, loadingMore: false, movements: [...m.movements, ...mvs], currentPage: meta.current_page, hasMore: meta.current_page < (meta.last_page ?? 1) }))
    } catch { error('Erro ao carregar mais movimentos.'); setHistoryModal(m => ({ ...m, loadingMore: false })) }
  }

  function movementTypeLabel(type: string) {
    if (type === 'purchase') return 'Compra'
    if (type === 'production') return 'Produção'
    return 'Ajuste'
  }

  function movementDate(m: Movement & Record<string, unknown>) {
    const d = String(m.movement_date ?? (m.purchase as Record<string, unknown>)?.purchased_at ?? m.created_at ?? '')
    if (!d) return '—'
    return new Date(d).toLocaleDateString('pt-BR')
  }

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <PageHeader title="Estoque" actionLabel="+ Registrar Compra" onAction={openPurchaseModal} />
          <SearchBar placeholder="Buscar ingrediente..." value={search} onChange={handleSearch} />

          <AsyncState loading={loading} error={loadError || null}
            empty={!items.length} emptyEntityName="ingrediente" emptySearch={search}>
            <>
              <div className="table-wrapper">
                <table className="stock-table">
                  <thead>
                    <tr>
                      <th>Nome</th><th>Tipo</th><th>Estoque</th>
                      <th>Preço / pacote <span className="help-icon" title="Custo Médio Móvel: média ponderada do custo histórico de compras deste ingrediente">ⓘ</span></th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td>{item.name}</td>
                        <td><span className={item.type === 'packaging' ? 'badge badge-packaging' : 'badge badge-ingredient'}>{item.type === 'packaging' ? 'Embalagem' : 'Ingrediente'}</span></td>
                        <td>{fmtQuantity(item.stock_quantity)} {item.unit}</td>
                        <td>{fmtRefPrice(item)}</td>
                        <td>
                          <div className="td-actions">
                            <button className="btn btn-secondary btn-sm" onClick={() => openAdjust(item)}>Ajustar</button>
                            <button className="btn btn-secondary btn-sm" onClick={() => openHistory(item)}>Histórico</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />
            </>
          </AsyncState>
        </div>
      </main>

      <Modal visible={purchaseModal.visible} title="Registrar Compra" hideActions onClose={() => setPurchaseModal(m => ({ ...m, visible: false }))}>
        <div className="form-row">
          <div className="form-group">
            <label>Data da compra (opcional)</label>
            <input type="date" value={purchaseForm.purchased_at} onChange={e => setPurchaseForm(f => ({ ...f, purchased_at: e.target.value }))} />
          </div>
          <div className="form-group">
            <label>Observação (opcional)</label>
            <input type="text" value={purchaseForm.notes} placeholder="Ex: Mercado Central" onChange={e => setPurchaseForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <p className="section-title" style={{ marginBottom: 8 }}>Itens comprados</p>
        <span className="field-error">{purchaseModal.errors.items?.[0] ?? ''}</span>
        <div className="purchase-row-header"><span>Ingrediente</span><span /></div>
        <div className="purchase-fields-header"><span>Tam. pacote</span><span>Nº pacotes</span><span>Total pago</span></div>
        <div className="ingredient-rows">
          {purchaseRows.map((row, index) => {
            const ppp = pricePerPackage(row)
            const unit = allIngredients.find(i => i.id === row.ingredient_id)?.unit ?? ''
            return (
              <div key={index} className="purchase-row">
                <IngredientAutocomplete value={row.ingredient_id} options={allIngredients} allowCreate
                  onChange={id => onIngredientSelect(index, id)}
                  onCreate={name => setQuickCreate({ visible: true, initialName: name, forceType: null, targetIndex: index })} />
                <button type="button" className="btn btn-danger btn-sm" onClick={() => setPurchaseRows(r => r.filter((_, i) => i !== index))}>×</button>
                <div className="purchase-row-fields">
                  <div className="purchase-pkg-wrap">
                    <NumericInput value={row.package_size} placeholder="Peso do pacote" onChange={v => setPurchaseRows(r => r.map((x, i) => i === index ? { ...x, package_size: v } : x))} />
                    <span className="purchase-unit-label">{unit}</span>
                  </div>
                  <NumericInput className="purchase-num-pkgs" value={row.num_packages} placeholder="Nº pacotes" onChange={v => setPurchaseRows(r => r.map((x, i) => i === index ? { ...x, num_packages: v } : x))} />
                  <div className="purchase-price-wrap">
                    <span className="purchase-price-prefix">R$</span>
                    <NumericInput className="purchase-price" value={row.total_price} placeholder="Preço total" onChange={v => setPurchaseRows(r => r.map((x, i) => i === index ? { ...x, total_price: v } : x))} />
                  </div>
                  {ppp !== null && <div className="purchase-row-calc purchase-row-calc--inline">R$ {fmtCurrency(ppp)}<br /><span>/pacote</span></div>}
                </div>
                {ppp !== null && <div className="purchase-row-calc purchase-row-calc--below">= R$ {fmtCurrency(ppp)} / pacote</div>}
              </div>
            )
          })}
        </div>
        <button type="button" className="btn btn-secondary btn-sm mt-8" onClick={() => setPurchaseRows(r => [...r, { ingredient_id: '', package_size: '', num_packages: '', total_price: '' }])}>+ Adicionar Item</button>
        {purchaseRows.some(r => r.total_price) && <div className="purchase-subtotal">Total: <strong>R$ {fmtCurrency(purchaseTotalValue)}</strong></div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setPurchaseModal(m => ({ ...m, visible: false }))}>Cancelar</button>
          <button type="button" className="btn btn-primary" disabled={purchaseModal.loading} onClick={savePurchase}>{purchaseModal.loading ? 'Salvando...' : 'Registrar'}</button>
        </div>
      </Modal>

      <Modal visible={adjustModal.visible} title={`Ajustar Estoque — ${adjustModal.ingredient?.name ?? ''}`} loading={adjustModal.loading} submitText="Salvar"
        onClose={() => setAdjustModal(m => ({ ...m, visible: false }))} onSubmit={saveAdjust}>
        <FormField label={`Quantidade em estoque (${adjustModal.ingredient?.unit})`} error={adjustModal.errors.stock_quantity?.[0]}>
          <NumericInput value={adjustForm.stock_quantity} onChange={v => setAdjustForm(f => ({ ...f, stock_quantity: v }))} />
        </FormField>
        <FormField label={`Estoque mínimo (${adjustModal.ingredient?.unit}) — opcional`} error={adjustModal.errors.min_stock?.[0]}>
          <NumericInput value={adjustForm.min_stock} placeholder="Ex: 500" onChange={v => setAdjustForm(f => ({ ...f, min_stock: v }))} />
        </FormField>
        <div className="form-group">
          <label>Data do ajuste</label>
          <input type="date" value={adjustForm.movement_date} onChange={e => setAdjustForm(f => ({ ...f, movement_date: e.target.value }))} />
        </div>
        <div className="form-group">
          <label>Observação (opcional)</label>
          <input type="text" value={adjustForm.notes} placeholder="Ex: Contagem física" onChange={e => setAdjustForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>

      <Modal visible={historyModal.visible} title={`Histórico — ${historyModal.ingredient?.name ?? ''}`} hideActions onClose={() => setHistoryModal(m => ({ ...m, visible: false }))}>
        {historyModal.loading ? <div className="loading">Carregando...</div>
          : !historyModal.movements.length ? <p className="empty-state">Nenhuma movimentação registrada.</p>
          : (
            <>
              <div className="table-wrapper">
                <table>
                  <thead><tr><th>Tipo</th><th>Qtd</th><th>Custo/un</th><th>Data</th><th>Ref.</th></tr></thead>
                  <tbody>
                    {historyModal.movements.map(m => {
                      const mv = m as Movement & Record<string, unknown>
                      return (
                        <tr key={m.id}>
                          <td>{movementTypeLabel(m.type)}</td>
                          <td className={parseFloat(String(m.quantity)) >= 0 ? 'text-positive' : 'text-negative'}>
                            {parseFloat(String(m.quantity)) >= 0 ? '+' : ''}{fmtQuantity(m.quantity)}
                          </td>
                          <td>R$ {fmtCurrency(mv.unit_price as number)}</td>
                          <td>{movementDate(mv)}</td>
                          <td>{String((mv.recipe as Record<string, unknown>)?.name ?? m.notes ?? '—')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <LoadMoreButton hasMore={historyModal.hasMore} loading={historyModal.loadingMore} onLoadMore={loadMoreHistory} size="sm" />
            </>
          )}
        <div className="modal-actions">
          <button type="button" className="btn btn-secondary" onClick={() => setHistoryModal(m => ({ ...m, visible: false }))}>Fechar</button>
        </div>
      </Modal>

      <QuickIngredientModal
        visible={quickCreate.visible}
        initialName={quickCreate.initialName}
        forceType={quickCreate.forceType}
        onCreated={onQuickCreated}
        onClose={() => setQuickCreate(q => ({ ...q, visible: false }))}
      />
    </div>
  )
}
