export function onlyNumbers(e: React.KeyboardEvent<HTMLInputElement>): void {
  if (!/[\d,.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault()
  }
}

export function parseDecimal(value: string): number {
  const str = String(value).trim()
  if (str.includes(',')) {
    // PT-BR: vírgula é separador decimal, ponto é separador de milhar
    return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0
  }
  // Sem vírgula: remove ponto apenas quando está em posição de milhar (3 dígitos após)
  return parseFloat(str.replace(/\.(\d{3})(?!\d)/g, '$1')) || 0
}
