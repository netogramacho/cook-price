import { FormField } from './FormField'
import { NumericInput } from './NumericInput'

interface Props {
  value: string | number
  onChange: (value: string) => void
  error?: string
}

export function InvisibleCostField({ value, onChange, error }: Props) {
  return (
    <FormField label="Custos Invisíveis (%)" error={error}>
      <NumericInput value={value} placeholder="Ex: 25" onChange={onChange} />
    </FormField>
  )
}
