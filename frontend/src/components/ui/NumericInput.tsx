import { onlyNumbers } from '../../utils/inputs'

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value: string | number
  onChange: (value: string) => void
}

export function NumericInput({ value, onChange, ...rest }: Props) {
  return (
    <input
      type="tel"
      inputMode="decimal"
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={onlyNumbers}
      {...rest}
    />
  )
}
