import { fmtCurrency, fmtQuantity } from '../utils/formatters'
import type { Production } from '../services/ProductionService'

function fmtDate(dateStr: string) {
  const [year, month, day] = String(dateStr).slice(0, 10).split('-')
  return `${day}/${month}/${year}`
}

interface Props {
  production: Production
  onCancel: (production: Production) => void
}

export function ProductionCard({ production: p, onCancel }: Props) {
  const cancelled = p.status === 'cancelled'

  return (
    <div className={`production-card${cancelled ? ' production-card--cancelled' : ''}`}>
      <div className="production-card-header">
        <div className="production-card-title">
          <span className="production-card-name">{p.snapshot.product_name ?? p.snapshot.recipe_name}</span>
          {cancelled && <span className="production-card-badge">Cancelada</span>}
        </div>
        <span className="production-card-cost">R$ {fmtCurrency(p.total_cost)}</span>
      </div>

      {p.notes && (
        <span className="production-card-notes">{p.notes}</span>
      )}

      <div className="production-card-footer">
        <span className="production-card-meta">
          {fmtDate(p.produced_at)}
          <span className="production-card-dot">·</span>
          {fmtQuantity(p.total_yield)} {p.snapshot.yield_unit}
          <span className="production-card-dot">·</span>
          R$ {fmtCurrency(p.unit_cost)}/{p.snapshot.yield_unit}
        </span>
        {!cancelled && (
          <button className="btn btn-secondary btn-sm" onClick={() => onCancel(p)}>
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}
