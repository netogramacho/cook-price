const currencyFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const quantityFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 })

export function fmtCurrency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  return currencyFmt.format(isNaN(n) ? 0 : n)
}

export function fmtQuantity(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  return quantityFmt.format(isNaN(n) ? 0 : n)
}

const dateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '—' : dateFmt.format(d)
}

export function fmtDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '—' : dateTimeFmt.format(d)
}

export function fmtPricePerUnit(
  totalPrice: number | string,
  packageSize: number | string,
  unit: string,
): string {
  const price = Number(totalPrice)
  const size = Number(packageSize)
  if (!size || isNaN(price) || isNaN(size)) return '—'
  return `R$ ${fmtCurrency(price / size)}/${unit}`
}
