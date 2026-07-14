import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AsyncState } from '../components/ui/AsyncState'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { AdminService } from '../services/AdminService'
import type { AdminUserDetail as Detail, AdminSubscription, MpStatus, PlanName } from '../services/AdminService'
import { useAppStore } from '../store/useAppStore'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { fmtDate, fmtDateTime } from '../utils/formatters'

const MP_STATUS_LABEL: Record<MpStatus, string> = {
  authorized: 'Ativa',
  pending: 'Pendente',
  paused: 'Pausada',
  cancelled: 'Cancelada',
}

const PLAN_OPTIONS: { value: PlanName; label: string }[] = [
  { value: 'free', label: 'Gratuito' },
  { value: 'trial', label: 'Experimentação' },
  { value: 'basic', label: 'Básico' },
  { value: 'pro', label: 'Pro' },
]

function StatusBadge({ status }: { status: MpStatus }) {
  return <span className={`badge badge-${status}`}>{MP_STATUS_LABEL[status]}</span>
}

export function AdminUserDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { success, error } = useAppStore()

  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [planValue, setPlanValue] = useState<PlanName>('free')
  const [busy, setBusy] = useState(false)

  async function loadDetail() {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await AdminService.getUser(id)
      setDetail(data)
      setPlanValue((data.user.plan?.name as PlanName) ?? 'free')
    } catch (err) {
      setLoadError((err as { message?: string }).message ?? 'Erro ao carregar usuário.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadDetail() }, [id])

  async function run(action: () => Promise<unknown>, okMsg: string, errMsg: string) {
    setBusy(true)
    try {
      await action()
      success(okMsg)
      await loadDetail()
    } catch (err) {
      error((err as { message?: string }).message ?? errMsg)
    } finally {
      setBusy(false)
    }
  }

  const cancelSub = useConfirmAction<AdminSubscription>({
    onConfirm: async (sub) => {
      await AdminService.cancelSubscription(sub.id)
      success('Assinatura cancelada.')
      await loadDetail()
    },
    onError: error,
  })

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container container-narrow">
          <button type="button" className="back-link" onClick={() => navigate('/admin/users')}>← Voltar para usuários</button>

          <AsyncState loading={loading} error={loadError} onRetry={loadDetail} empty={!detail}>
            {detail && (
              <>
                <div className="admin-card">
                  <div className="admin-card-head">
                    <h1 className="page-title" style={{ margin: 0 }}>{detail.user.name}</h1>
                    {detail.user.is_admin && <span className="badge badge-admin">admin</span>}
                  </div>
                  <dl className="admin-dl">
                    <div><dt>E-mail</dt><dd>{detail.user.email}</dd></div>
                    <div><dt>Telefone</dt><dd>{detail.user.phone ?? '—'}</dd></div>
                    <div><dt>E-mail verificado</dt><dd>{detail.user.email_verified_at
                      ? <span className="badge badge-authorized">{fmtDateTime(detail.user.email_verified_at)}</span>
                      : <span className="badge badge-cancelled">Não verificado</span>}</dd></div>
                    <div><dt>Plano atual</dt><dd><span className="badge badge-ingredient">{detail.user.plan?.label ?? '—'}</span></dd></div>
                    <div><dt>Cadastro</dt><dd>{fmtDate(detail.user.created_at)}</dd></div>
                  </dl>
                </div>

                <div className="admin-card">
                  <h2 className="admin-card-title">Alterar plano</h2>
                  <div className="admin-inline-form">
                    <select value={planValue} disabled={busy} onChange={e => setPlanValue(e.target.value as PlanName)}>
                      {PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <button className="btn btn-primary" disabled={busy || planValue === detail.user.plan?.name}
                      onClick={() => run(() => AdminService.updatePlan(id, planValue), 'Plano atualizado.', 'Erro ao atualizar plano.')}>
                      Salvar plano
                    </button>
                  </div>
                  <p className="settings-hint">Altera o plano diretamente, sem passar pelo MercadoPago.</p>
                </div>

                <div className="admin-card">
                  <h2 className="admin-card-title">Uso da conta</h2>
                  <div className="admin-counts">
                    <div><strong>{detail.counts.ingredients}</strong><span>Ingredientes</span></div>
                    <div><strong>{detail.counts.insumos}</strong><span>Insumos</span></div>
                    <div><strong>{detail.counts.recipes}</strong><span>Receitas</span></div>
                    <div><strong>{detail.counts.products}</strong><span>Produtos</span></div>
                    <div><strong>{detail.counts.productions}</strong><span>Lotes</span></div>
                  </div>
                </div>

                <div className="admin-card">
                  <h2 className="admin-card-title">Assinaturas</h2>
                  {detail.subscriptions.length === 0 && <p className="settings-hint">Nenhuma assinatura registrada.</p>}
                  {detail.subscriptions.map(sub => (
                    <div key={sub.id} className="admin-sub">
                      <div className="admin-sub-info">
                        <div className="admin-sub-head">
                          <strong>{sub.plan?.label ?? '—'}</strong>
                          <StatusBadge status={sub.mp_status} />
                          {sub.cancel_at_period_end && <span className="badge badge-paused">encerra no fim do período</span>}
                        </div>
                        <span className="admin-sub-meta">
                          Início: {fmtDate(sub.starts_at)} · Fim: {fmtDate(sub.ends_at)} · Criada: {fmtDateTime(sub.created_at)}
                        </span>
                        {sub.mp_preapproval_id && <span className="admin-sub-meta">MP: {sub.mp_preapproval_id}</span>}
                      </div>
                      <div className="admin-sub-actions">
                        <button className="btn btn-secondary btn-sm" disabled={busy || !sub.mp_preapproval_id}
                          onClick={() => run(() => AdminService.syncSubscription(sub.id), 'Assinatura sincronizada.', 'Erro ao sincronizar.')}>
                          Sincronizar
                        </button>
                        <button className="btn btn-danger btn-sm" disabled={busy || sub.mp_status === 'cancelled'}
                          onClick={() => cancelSub.open(sub)}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="admin-card">
                  <h2 className="admin-card-title">Suporte</h2>
                  <div className="admin-support-actions">
                    {!detail.user.email_verified_at && (
                      <>
                        <button className="btn btn-secondary btn-sm" disabled={busy}
                          onClick={() => run(() => AdminService.resendVerification(id), 'E-mail de verificação reenviado.', 'Erro ao reenviar verificação.')}>
                          Reenviar verificação
                        </button>
                        <button className="btn btn-secondary btn-sm" disabled={busy}
                          onClick={() => run(() => AdminService.verifyEmail(id), 'E-mail verificado manualmente.', 'Erro ao verificar e-mail.')}>
                          Verificar e-mail manualmente
                        </button>
                      </>
                    )}
                    <button className="btn btn-secondary btn-sm" disabled={busy}
                      onClick={() => run(() => AdminService.sendPasswordReset(id), 'Link de redefinição enviado.', 'Erro ao enviar link de redefinição.')}>
                      Enviar redefinição de senha
                    </button>
                  </div>
                </div>
              </>
            )}
          </AsyncState>
        </div>
      </main>

      <ConfirmModal
        visible={cancelSub.confirm.visible}
        title="Cancelar Assinatura"
        message={<>Cancelar a assinatura <strong>{cancelSub.confirm.item?.plan?.label}</strong> deste usuário? O acesso é mantido até o fim do período pago.</>}
        loading={cancelSub.confirm.loading}
        confirmText="Cancelar assinatura"
        onConfirm={cancelSub.execute}
        onClose={cancelSub.close}
      />
    </div>
  )
}
