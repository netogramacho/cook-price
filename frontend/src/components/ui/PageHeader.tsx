interface Props {
  title: string
  actionLabel?: string
  onAction?: () => void
}

export function PageHeader({ title, actionLabel, onAction }: Props) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {actionLabel && onAction && (
        <button className="btn btn-primary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
