import { FormField } from './FormField'
import { NumericInput } from './NumericInput'

interface Props {
  value: number
  onChange: (value: number) => void
  error?: string
}

export function ProfitMultiplierField({ value, onChange, error }: Props) {
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
