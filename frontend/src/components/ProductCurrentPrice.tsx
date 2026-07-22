import { useState } from 'react'
import { NumericInput } from './ui/NumericInput'
import { ProductService } from '../services/ProductService'
import type { Product } from '../services/ProductService'
import { useAppStore } from '../store/useAppStore'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'
import { parseDecimal } from '../utils/inputs'

interface Props {
  product: Product
  onProductUpdated: (product: Product) => void
}

/**
 * Card do preço atual de venda: por padrão é o sugerido pelo multiplicador, mas a
 * pessoa pode fixar um preço à mão — e aí a margem exibida é a real desse preço.
 */
export function ProductCurrentPrice({ product, onProductUpdated }: Props) {
  const { success, error } = useAppStore()

  const [editing, setEditing] = useState(false)
  const [priceInput, setPriceInput] = useState('')
  const [saving, setSaving] = useState(false)

  const isManual = product.custom_price !== null

  async function save(custom_price: number | null) {
    setSaving(true)
    try {
      onProductUpdated(await ProductService.updatePrice(product.id, custom_price))
      success(custom_price === null ? 'Preço voltou ao calculado.' : 'Preço atualizado.')
      setEditing(false)
    } catch (err) {
      error((err as { message?: string })?.message ?? 'Erro ao salvar preço.')
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div className="cost-item cost-item-highlight">
        <label>Preço Atual / {product.yield_unit}</label>
        <div className="price-edit">
          <NumericInput value={priceInput} placeholder={fmtCurrency(product.calculated_price_per_yield)}
            onChange={setPriceInput} />
          <button type="button" className="btn btn-primary btn-sm" disabled={saving}
            onClick={() => save(parseDecimal(priceInput))}>Salvar</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={saving}
            onClick={() => setEditing(false)}>Cancelar</button>
          {isManual && (
            <button type="button" className="btn btn-secondary btn-sm" disabled={saving}
              onClick={() => save(null)}>Usar calculado</button>
          )}
        </div>
        <span className="price-edit-hint">
          Calculado pelo multiplicador: R$ {fmtCurrency(product.calculated_price_per_yield)} · custo R$ {fmtCurrency(product.cost_per_yield)}/{product.yield_unit}
        </span>
      </div>
    )
  }

  return (
    <div className="cost-item cost-item-highlight">
      <label>
        Preço Atual / {product.yield_unit}
        {isManual
          ? <> (manual · margem {fmtQuantity(product.profit_margin_pct)}%)</>
          : <> (preço sugerido · margem {fmtQuantity(product.profit_margin_pct)}%)</>}
      </label>
      <div className="price-edit">
        <strong>R$ {fmtCurrency(product.suggested_price_per_yield)}</strong>
        <button type="button" className="btn btn-secondary btn-sm"
          onClick={() => { setPriceInput(fmtCurrency(product.suggested_price_per_yield)); setEditing(true) }}>
          Alterar preço
        </button>
      </div>
    </div>
  )
}
