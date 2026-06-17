import { FormField } from './FormField'
import { NumericInput } from './NumericInput'

interface Props {
  value: number
  onChange: (value: number) => void
  error?: string
  locked?: boolean
  onLockedClick?: () => void
}

export function ProfitMultiplierField({ value, onChange, error, locked, onLockedClick }: Props) {
  if (locked) {
    return (
      <div className="form-group form-field-locked" onClick={onLockedClick}>
        <label>Multiplicador de Lucro <span className="onboarding-step-badge">Basic</span></label>
        <div className="multiplier-control">
          <input type="range" min="1" max="6" step="0.25" value={3} onChange={() => {}} />
          <NumericInput className="multiplier-input" value={3} onChange={() => {}} />
          <span className="multiplier-suffix">x</span>
        </div>
      </div>
    )
  }

  const margin = (() => {
    const m = Number(value)
    if (!m || m <= 0) return '0,0'
    return ((1 - 1 / m) * 100).toFixed(1).replace('.', ',')
  })()

  return (
    <FormField label="Multiplicador de Lucro" error={error}>
      <div className="multiplier-control">
        <input
          type="range" min="1" max="6" step="0.25"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
        />
        <NumericInput
          className="multiplier-input"
          value={value}
          onChange={v => onChange(Number(v))}
        />
        <span className="multiplier-suffix">x</span>
      </div>
      <p className="multiplier-hint">Margem de lucro: {margin}%</p>
    </FormField>
  )
}
