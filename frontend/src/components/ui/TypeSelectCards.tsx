interface Option {
  value: string
  icon?: string
  label: string
  description: string
}

interface Props {
  label?: string
  options: Option[]
  onSelect: (value: string) => void
}

export function TypeSelectCards({ label = 'O que você está cadastrando?', options, onSelect }: Props) {
  return (
    <div className="type-select">
      <p className="type-select-label">{label}</p>
      <div className="type-select-cards">
        {options.map(opt => (
          <button key={opt.value} type="button" className="type-card" onClick={() => onSelect(opt.value)}>
            {opt.icon && <span className="type-card-icon">{opt.icon}</span>}
            <strong>{opt.label}</strong>
            <span>{opt.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
