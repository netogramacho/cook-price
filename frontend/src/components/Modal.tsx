interface Props {
  visible: boolean
  title?: string
  loading?: boolean
  submitText?: string
  hideActions?: boolean
  closeOnOverlay?: boolean
  children: React.ReactNode
  onClose: () => void
  onSubmit?: () => void
}

export function Modal({
  visible,
  title = '',
  loading = false,
  submitText = 'Salvar',
  hideActions = false,
  closeOnOverlay = false,
  children,
  onClose,
  onSubmit,
}: Props) {
  if (!visible) return null

  return (
    <div className="modal-overlay" onClick={closeOnOverlay ? onClose : undefined}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {children}
          {!hideActions && (
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" disabled={loading} onClick={onClose}>
                Cancelar
              </button>
              <button type="button" className="btn btn-primary" disabled={loading} onClick={onSubmit}>
                {loading ? 'Salvando...' : submitText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
