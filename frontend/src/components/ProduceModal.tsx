import { useState } from 'react'
import { Modal } from './Modal'
import { ProductionService } from '../services/ProductionService'
import { useAppStore } from '../store/useAppStore'
import { handleApiError } from '../utils/apiError'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'
import type { Recipe } from '../services/RecipeService'

interface Props {
  recipe: Recipe | null
  onClose: () => void
  onSuccess: () => void
}

export function ProduceModal({ recipe, onClose, onSuccess }: Props) {
  const { success, error } = useAppStore()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})

  async function handleSubmit() {
    if (!recipe) return
    setLoading(true)
    try {
      await ProductionService.create({ recipe_id: recipe.id, notes: notes || undefined })
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

  const unitCost = recipe?.cost_per_yield ?? null

  return (
    <Modal
      visible={recipe !== null}
      title="Registrar Produção"
      loading={loading}
      submitText="Registrar"
      onClose={handleClose}
      onSubmit={handleSubmit}
    >
      {recipe && (
        <>
          <div className="cost-summary" style={{ marginBottom: 16 }}>
            <div className="cost-item">
              <label>Receita</label>
              <strong>{recipe.name}</strong>
            </div>
            <div className="cost-item">
              <label>Rendimento</label>
              <strong>{fmtQuantity(recipe.yield)} {recipe.yield_unit}</strong>
            </div>
            {recipe.production_cost != null && (
              <div className="cost-item">
                <label>Custo de produção</label>
                <strong>R$ {fmtCurrency(recipe.production_cost)}</strong>
              </div>
            )}
            {unitCost != null && (
              <div className="cost-item">
                <label>Custo por {recipe.yield_unit}</label>
                <strong>R$ {fmtCurrency(unitCost)}</strong>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>Observações (opcional)</label>
            <input
              type="text"
              value={notes}
              placeholder="Ex: Lote de natal"
              onChange={e => setNotes(e.target.value)}
            />
            {errors.notes?.[0] && <span className="field-error">{errors.notes[0]}</span>}
          </div>
        </>
      )}
    </Modal>
  )
}
