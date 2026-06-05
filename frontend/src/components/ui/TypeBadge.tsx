interface Props {
  type: string
}

export function TypeBadge({ type }: Props) {
  const isPackaging = type === 'packaging'
  return (
    <span className={isPackaging ? 'badge badge-packaging' : 'badge badge-ingredient'}>
      {isPackaging ? 'Embalagem' : 'Ingrediente'}
    </span>
  )
}
