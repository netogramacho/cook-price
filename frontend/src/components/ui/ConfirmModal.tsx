import { Modal } from '../Modal'

interface Props {
  visible: boolean
  title: string
  message: React.ReactNode
  loading?: boolean
  confirmText?: string
  onConfirm: () => void
  onClose: () => void
}

export function ConfirmModal({ visible, title, message, loading = false, confirmText = 'Excluir', onConfirm, onClose }: Props) {
  return (
    <Modal visible={visible} title={title} hideActions onClose={onClose}>
      <p className="confirm-modal-text">{message}</p>
      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" disabled={loading} onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn btn-danger" disabled={loading} onClick={onConfirm}>
          {loading ? 'Aguarde...' : confirmText}
        </button>
      </div>
    </Modal>
  )
}
