import { NumericInput } from './NumericInput'
import { Tooltip } from './Tooltip'

const TOOLTIP_TEXT = 'Gastos indiretos que não aparecem nos ingredientes: gás, energia, água e mão de obra. Exemplo: com 15%, um custo base de R$ 20,00 adiciona R$ 3,00 ao custo de produção.'

interface Props {
  value: string | number
  onChange: (value: string) => void
  error?: string
  locked?: boolean
  onLockedClick?: () => void
}

export function InvisibleCostField({ value, onChange, error, locked, onLockedClick }: Props) {
  if (locked) {
    return (
      <div className="form-group form-field-locked" onClick={onLockedClick}>
        <div className="form-label-row">
          <label>Custos Invisíveis (%) <span className="onboarding-step-badge">Basic</span></label>
          <Tooltip content={TOOLTIP_TEXT} />
        </div>
        <NumericInput value="" placeholder="Ex: 25" onChange={() => {}} />
      </div>
    )
  }

  return (
    <div className={`form-group${error ? ' has-error' : ''}`}>
      <div className="form-label-row">
        <label>Custos Invisíveis (%)</label>
        <Tooltip content={TOOLTIP_TEXT} />
      </div>
      <NumericInput value={value} placeholder="Ex: 25" onChange={onChange} />
      <span className="field-error">{error ?? ''}</span>
    </div>
  )
}
