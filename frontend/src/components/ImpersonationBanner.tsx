import { api } from '../lib/api'
import { getUser, isImpersonating, stopImpersonation } from '../lib/auth'

export function ImpersonationBanner() {
  if (!isImpersonating()) return null

  const name = getUser()?.name ?? 'usuário'

  async function exit() {
    // Revoga o token de impersonation no servidor (é o token ativo agora).
    try { await api.post('/auth/logout') } catch { /* ignore */ }
    stopImpersonation()
    window.location.href = '/admin/users'
  }

  return (
    <div className="impersonation-banner">
      <span>⚠️ Você está acessando como <strong>{name}</strong></span>
      <button className="btn btn-sm" onClick={exit}>Voltar para admin</button>
    </div>
  )
}
