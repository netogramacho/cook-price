import { useState } from 'react'
import { Modal } from './Modal'
import { ProductionService } from '../services/ProductionService'
import { useAppStore } from '../store/useAppStore'
import { handleApiError } from '../utils/apiError'
import { capitalizeFirst } from '../utils/inputs'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'
import type { Product } from '../services/ProductService'

interface Props {
  product: Product | null
  onClose: () => void
  onSuccess: () => void
}

export function ProduceModal({ product, onClose, onSuccess }: Props) {
  const { success, error } = useAppStore()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit() {
    if (!product) return
    setLoading(true)
    try {
      await ProductionService.create({ product_id: product.id, notes: notes || undefined })
      success('Produção registrada com sucesso.')
      setNotes('')
      setErrors({})
      onSuccess()
    } catch (err) {
      handleApiError(err, setErrors, error, 'Erro ao registrar produção.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setNotes('')
    setErrors({})
    onClose()
  }

  return (
    <Modal
      visible={product !== null}
      title="Registrar Produção"
      loading={loading}
      submitText="Registrar"
      onClose={handleClose}
      onSubmit={handleSubmit}
    >
      {product && (
        <>
          <div className="cost-summary" style={{ marginBottom: 16 }}>
            <div className="cost-item">
              <label>Produto</label>
              <strong>{product.name}</strong>
            </div>
            <div className="cost-item">
              <label>Rendimento</label>
              <strong>{fmtQuantity(product.yield)} {product.yield_unit}</strong>
            </div>
            <div className="cost-item">
              <label>Custo de produção</label>
              <strong>R$ {fmtCurrency(product.production_cost)}</strong>
            </div>
            <div className="cost-item">
              <label>Custo por {product.yield_unit}</label>
              <strong>R$ {fmtCurrency(product.cost_per_yield)}</strong>
            </div>
          </div>

          <div className="form-group">
            <label>Observações (opcional)</label>
            <input
              type="text"
              value={notes}
              placeholder="Ex: Lote de natal"
              onChange={e => setNotes(capitalizeFirst(e.target.value))}
            />
            {errors.notes?.[0] && <span className="field-error">{errors.notes[0]}</span>}
          </div>
        </>
      )}
    </Modal>
  )
}
