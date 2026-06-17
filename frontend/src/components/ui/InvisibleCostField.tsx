import { FormField } from './FormField'
import { NumericInput } from './NumericInput'

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
        <label>Custos Invisíveis (%) <span className="onboarding-step-badge">Basic</span></label>
        <NumericInput value="" placeholder="Ex: 25" onChange={() => {}} />
      </div>
    )
  }

  return (
    <FormField label="Custos Invisíveis (%)" error={error}>
      <NumericInput value={value} placeholder="Ex: 25" onChange={onChange} />
    </FormField>
  )
}
