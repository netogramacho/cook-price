import { useEffect, useRef } from 'react'

interface Props {
  placeholder?: string
  value: string
  onChange: (value: string) => void
  debounce?: number
}

export function SearchBar({ placeholder = 'Buscar...', value, onChange, debounce = 300 }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(v), debounce)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div className="search-bar">
      <input
        type="text"
        className="search-input"
        placeholder={placeholder}
        defaultValue={value}
        onChange={handleChange}
      />
    </div>
  )
}
