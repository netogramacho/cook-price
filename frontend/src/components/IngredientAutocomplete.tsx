import { useState, useEffect } from 'react'

interface Option {
  id: string
  name: string
  unit: string
}

interface Props {
  value: string
  options: Option[]
  placeholder?: string
  allowCreate?: boolean
  onChange: (id: string) => void
  onCreate?: (name: string) => void
}

export function IngredientAutocomplete({ value, options, placeholder = 'Buscar ingrediente...', allowCreate = false, onChange, onCreate }: Props) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!value) { setSearch(''); return }
    const found = options.find(o => o.id === value)
    if (found) setSearch(found.name)
  }, [value, options])

  const filtered = search.trim()
    ? options.filter(o => o.name.toLowerCase().includes(search.trim().toLowerCase()))
    : options

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    setSearch(e.target.value)
    setOpen(true)
    if (!e.target.value.trim()) onChange('')
  }

  function select(option: Option) {
    setSearch(option.name)
    setOpen(false)
    onChange(option.id)
  }

  function handleBlur() {
    setTimeout(() => setOpen(false), 150)
  }

  return (
    <div className="autocomplete">
      <input
        type="text"
        value={search}
        placeholder={placeholder}
        autoComplete="off"
        onChange={handleInput}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
      />
      {open && (filtered.length > 0 || search.trim()) && (
        <div className="autocomplete-dropdown">
          {filtered.length === 0 && !allowCreate && (
            <div className="autocomplete-empty">Nenhum resultado.</div>
          )}
          {filtered.length > 0 && (
            <ul>
              {filtered.map(o => (
                <li key={o.id} onMouseDown={e => { e.preventDefault(); select(o) }}>
                  {o.name} <span className="autocomplete-unit">({o.unit})</span>
                </li>
              ))}
            </ul>
          )}
          {allowCreate && search.trim() && (
            <div className="autocomplete-create" onMouseDown={e => { e.preventDefault(); onCreate?.(search.trim()) }}>
              + Criar "{search.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  )
}
