export type UnitFamily = 'mass' | 'volume' | 'count'

interface UnitMeta {
  family: UnitFamily
  factor: number
  label: string
}

export const UNITS: Record<string, UnitMeta> = {
  g:  { family: 'mass',   factor: 1,    label: 'g — Grama' },
  kg: { family: 'mass',   factor: 1000, label: 'kg — Quilograma' },
  ml: { family: 'volume', factor: 1,    label: 'ml — Mililitro' },
  L:  { family: 'volume', factor: 1000, label: 'L — Litro' },
  un: { family: 'count',  factor: 1,    label: 'un — Unidade' },
}

// Unidades oferecidas no cadastro de ingredientes (embalagem usa sempre 'un')
export const INGREDIENT_UNITS = ['g', 'kg', 'ml', 'L', 'un'] as const

export function unitLabel(unit: string): string {
  return UNITS[unit]?.label ?? unit
}

export function familyOf(unit: string): UnitFamily | null {
  return UNITS[unit]?.family ?? null
}

export function unitsInFamily(family: UnitFamily | null): string[] {
  if (!family) return []
  return Object.keys(UNITS).filter(u => UNITS[u].family === family)
}

// Unidade base da família (a de fator 1: g, ml ou un)
export function baseUnit(unit: string): string {
  const family = familyOf(unit)
  const base = unitsInFamily(family).find(u => UNITS[u].factor === 1)
  return base ?? unit
}
