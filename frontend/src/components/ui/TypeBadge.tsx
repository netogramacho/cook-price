interface Props {
  type: string
}

export function TypeBadge({ type }: Props) {
  const isInsumo = type === 'insumo' || type === 'packaging'
  return (
    <span className={isInsumo ? 'badge badge-packaging' : 'badge badge-ingredient'}>
      {isInsumo ? 'Insumo' : 'Ingrediente'}
    </span>
  )
}
