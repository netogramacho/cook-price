interface Props {
  label: string
  error?: string
  children: React.ReactNode
}

export function FormField({ label, error, children }: Props) {
  return (
    <div className={`form-group${error ? ' has-error' : ''}`}>
      <label>{label}</label>
      {children}
      <span className="field-error">{error ?? ''}</span>
    </div>
  )
}
