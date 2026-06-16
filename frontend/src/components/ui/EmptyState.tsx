interface Props {
  search?: string
  entityName: string
  message?: string
  action?: { label: string; onClick: () => void }
}

export function EmptyState({ search, entityName, message, action }: Props) {
  const text = message
    ?? (search
      ? `Nenhum ${entityName} encontrado para "${search}".`
      : `Nenhum ${entityName} cadastrado ainda.`)

  if (action && !search) {
    return (
      <div className="empty-state-cta">
        <p className="empty-state-cta-text">{text}</p>
        <button className="btn btn-primary" onClick={action.onClick}>{action.label}</button>
      </div>
    )
  }

  return <p className="empty-state">{text}</p>
}
