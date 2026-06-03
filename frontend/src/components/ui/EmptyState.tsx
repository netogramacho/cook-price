interface Props {
  search?: string
  entityName: string
  message?: string
}

export function EmptyState({ search, entityName, message }: Props) {
  const text = message
    ?? (search
      ? `Nenhum ${entityName} encontrado para "${search}".`
      : `Nenhum ${entityName} cadastrado ainda.`)

  return <p className="empty-state">{text}</p>
}
