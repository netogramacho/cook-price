export function onlyNumbers(e: React.KeyboardEvent<HTMLInputElement>): void {
  if (!/[\d,.]/.test(e.key) && !['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
    e.preventDefault()
  }
}

export function parseDecimal(value: string): number {
  return parseFloat(value.replace(',', '.')) || 0
}
