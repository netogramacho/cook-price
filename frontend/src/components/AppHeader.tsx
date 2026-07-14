import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { BrandLogo } from './BrandLogo'
import { Modal } from './Modal'
import { FormField } from './ui/FormField'
import { ProfitMultiplierField } from './ui/ProfitMultiplierField'
import { InvisibleCostField } from './ui/InvisibleCostField'
import { AuthService } from '../services/AuthService'
import { UserService } from '../services/UserService'
import { useAppStore } from '../store/useAppStore'
import { useModal } from '../hooks/useModal'
import { handleApiError } from '../utils/apiError'
import { getUser, isAdmin } from '../lib/auth'
import { triggerPlanUpgrade } from '../lib/api'
import { parseDecimal } from '../utils/inputs'

interface ChangePasswordForm {
  current_password: string
  password: string
  password_confirmation: string
}

interface SettingsForm {
  invisible_cost_pct: string
  profit_multiplier: number
}

interface NavLink { path: string; label: string; feature?: 'has_products' | 'has_production'; lockedMsg?: string }

const NAV_GROUPS: { title?: string; links: NavLink[] }[] = [
  { links: [
    { path: '/dashboard', label: '📊 Dashboard' },
  ] },
  { title: 'Cadastros', links: [
    { path: '/ingredients', label: '🥕 Ingredientes' },
    { path: '/insumos',     label: '📦 Insumos' },
  ] },
  { title: 'O que eu faço', links: [
    { path: '/recipes',  label: '📖 Receitas' },
    { path: '/produtos', label: '🏷️ Produtos', feature: 'has_products', lockedMsg: 'O cadastro de produtos está disponível nos planos pagos.' },
  ] },
  { title: 'Histórico', links: [
    { path: '/producoes', label: '🏭 Lotes', feature: 'has_production', lockedMsg: 'O histórico de produção está disponível nos planos pagos.' },
  ] },
]

const ADMIN_GROUP: { title?: string; links: NavLink[] } = {
  title: 'Admin', links: [
    { path: '/admin/users',          label: '👤 Usuários' },
    { path: '/admin/mp-assinaturas', label: '💳 Assinaturas MP' },
    { path: '/admin/logs',           label: '🧾 Logs MP' },
  ],
}

export function AppHeader() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { success, error } = useAppStore()
  const userName = getUser()?.name ?? ''

  const hasPricing = !!getUser()?.plan.has_pricing
  const navGroups = isAdmin() ? [...NAV_GROUPS, ADMIN_GROUP] : NAV_GROUPS

  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [sidebarOpen])

  const pwModal = useModal({ visible: false, loading: false, errors: {} as Record<string, string[]> })
  const [pwForm, setPwForm] = useState<ChangePasswordForm>({ current_password: '', password: '', password_confirmation: '' })

  const settingsModal = useModal({ visible: false, loading: false, errors: {} as Record<string, string[]> })
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({ invisible_cost_pct: '', profit_multiplier: 3 })

  async function handleLogout() {
    await AuthService.logout()
    navigate('/login')
  }

  function openChangePassword() {
    setPwForm({ current_password: '', password: '', password_confirmation: '' })
    pwModal.open()
  }

  async function savePassword() {
    pwModal.startSubmit()
    try {
      await UserService.changePassword(pwForm)
      success('Senha alterada com sucesso.')
      pwModal.close()
    } catch (err) {
      handleApiError(err, pwModal.setErrors, error, 'Erro ao alterar senha.')
    } finally {
      pwModal.setLoading(false)
    }
  }

  async function openSettings() {
    try {
      const user = await UserService.get()
      setSettingsForm({
        invisible_cost_pct: String(user.invisible_cost_pct ?? ''),
        profit_multiplier: Number(user.profit_multiplier ?? 3),
      })
    } catch {
      error('Erro ao carregar configurações.')
      return
    }
    settingsModal.open()
  }

  async function saveSettings() {
    settingsModal.startSubmit()
    try {
      await UserService.updateSettings({
        invisible_cost_pct: parseDecimal(String(settingsForm.invisible_cost_pct)),
        profit_multiplier: parseDecimal(String(settingsForm.profit_multiplier)),
      } as Parameters<typeof UserService.updateSettings>[0])
      success('Configurações salvas.')
      settingsModal.close()
    } catch (err) {
      handleApiError(err, settingsModal.setErrors, error, 'Erro ao salvar configurações.')
    } finally {
      settingsModal.setLoading(false)
    }
  }

  return (
    <>
      <div className="mobile-topbar">
        <button className="sidebar-toggle" onClick={() => setSidebarOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
        <Link to="/dashboard" className="header-brand"><BrandLogo height={36} /></Link>
      </div>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`app-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <Link to="/dashboard" className="header-brand"><BrandLogo height={60} /></Link>
        </div>
        <nav className="sidebar-nav">
          {navGroups.map((group, gi) => (
            <div key={group.title ?? `group-${gi}`} className="sidebar-nav-group">
              {group.title && <span className="sidebar-nav-group-title">{group.title}</span>}
              {group.links.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={pathname === link.path ? 'active' : ''}
                  onClick={e => {
                    if (link.feature && !getUser()?.plan[link.feature]) {
                      e.preventDefault()
                      triggerPlanUpgrade(link.lockedMsg)
                    }
                    setSidebarOpen(false)
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="user-name">{userName}</span>
          <span className="sidebar-plan-badge">{getUser()?.plan?.label ?? 'Gratuito'}</span>
          <button className="btn btn-primary btn-sm btn-full" onClick={() => triggerPlanUpgrade()}>Meu Plano</button>
          <button className="btn btn-secondary btn-sm btn-full" onClick={openSettings}>Configurações</button>
          <button className="btn btn-secondary btn-sm btn-full" onClick={openChangePassword}>Alterar Senha</button>
          <button className="btn btn-secondary btn-sm btn-full" onClick={handleLogout}>Sair</button>
        </div>
      </aside>

      <Modal
        visible={pwModal.state.visible}
        title="Alterar Senha"
        loading={pwModal.state.loading}
        submitText="Salvar"
        onClose={pwModal.close}
        onSubmit={savePassword}
      >
        <FormField label="Senha atual" error={pwModal.state.errors.current_password?.[0]}>
          <input type="password" value={pwForm.current_password} autoComplete="current-password"
            onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} />
        </FormField>
        <FormField label="Nova senha" error={pwModal.state.errors.password?.[0]}>
          <input type="password" value={pwForm.password} autoComplete="new-password"
            onChange={e => setPwForm(f => ({ ...f, password: e.target.value }))} />
        </FormField>
        <FormField label="Confirmar nova senha" error={pwModal.state.errors.password_confirmation?.[0]}>
          <input type="password" value={pwForm.password_confirmation} autoComplete="new-password"
            onChange={e => setPwForm(f => ({ ...f, password_confirmation: e.target.value }))} />
        </FormField>
      </Modal>

      <Modal
        visible={settingsModal.state.visible}
        title="Configurações de Precificação"
        loading={settingsModal.state.loading}
        submitText="Salvar"
        onClose={settingsModal.close}
        onSubmit={saveSettings}
      >
        <p className="settings-hint">Custos invisíveis: padrão ao criar novas <strong>receitas</strong>. Multiplicador de lucro: padrão ao criar novos <strong>produtos</strong>.</p>
        <InvisibleCostField
          value={settingsForm.invisible_cost_pct}
          onChange={v => setSettingsForm(f => ({ ...f, invisible_cost_pct: v }))}
          error={settingsModal.state.errors.invisible_cost_pct?.[0]}
          locked={!hasPricing}
          onLockedClick={() => triggerPlanUpgrade('A precificação avançada está disponível nos planos pagos.')}
        />
        <ProfitMultiplierField
          value={settingsForm.profit_multiplier}
          onChange={v => setSettingsForm(f => ({ ...f, profit_multiplier: v }))}
          error={settingsModal.state.errors.profit_multiplier?.[0]}
          locked={!hasPricing}
          onLockedClick={() => triggerPlanUpgrade('A precificação avançada está disponível nos planos pagos.')}
        />
      </Modal>
    </>
  )
}
