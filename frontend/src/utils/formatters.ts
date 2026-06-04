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
