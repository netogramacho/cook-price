import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Modal } from './Modal'
import { PlanModal } from './PlanModal'
import { FormField } from './ui/FormField'
import { ProfitMultiplierField } from './ui/ProfitMultiplierField'
import { InvisibleCostField } from './ui/InvisibleCostField'
import { AuthService } from '../services/AuthService'
import { UserService } from '../services/UserService'
import { useAppStore } from '../store/useAppStore'
import { useModal } from '../hooks/useModal'
import { handleApiError } from '../utils/apiError'
import { getUser } from '../lib/auth'
import { parseDecimal } from '../utils/inputs'

interface ChangePasswordForm {
  current_password: string
  password: string
  password_confirmation: string
}

interface SettingsForm {
  invisible_cost_pct: string
  profit_multiplier: number
  disable_stock_control: boolean
}

const NAV_LINKS = [
  { path: '/dashboard',    label: '📊 Dashboard' },
  { path: '/ingredients',  label: '🥕 Ingredientes' },
  { path: '/recipes',      label: '📖 Receitas' },
  { path: '/stock',        label: '📦 Estoque' },
]

export function AppHeader() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { success, error } = useAppStore()
  const userName = getUser()?.name ?? ''

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [planModalOpen, setPlanModalOpen] = useState(false)

  const pwModal = useModal({ visible: false, loading: false, errors: {} as Record<string, string[]> })
  const [pwForm, setPwForm] = useState<ChangePasswordForm>({ current_password: '', password: '', password_confirmation: '' })

  const settingsModal = useModal({ visible: false, loading: false, errors: {} as Record<string, string[]> })
  const [settingsForm, setSettingsForm] = useState<SettingsForm>({ invisible_cost_pct: '', profit_multiplier: 3, disable_stock_control: false })

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
        disable_stock_control: Boolean((user as unknown as Record<string, unknown>).disable_stock_control),
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
        disable_stock_control: settingsForm.disable_stock_control,
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
        <a href="/dashboard" className="header-brand">🍳 CookPrice</a>
      </div>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`app-sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <a href="/dashboard" className="header-brand">🍳 CookPrice</a>
        </div>
        <nav className="sidebar-nav">
          {NAV_LINKS.map(link => (
            <a
              key={link.path}
              href={link.path}
              className={pathname === link.path ? 'active' : ''}
              onClick={e => { e.preventDefault(); navigate(link.path); setSidebarOpen(false) }}
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-user">
          <span className="user-name">{userName}</span>
          <span className="sidebar-plan-badge">{getUser()?.plan?.label ?? 'Gratuito'}</span>
          <button className="btn btn-primary btn-sm btn-full" onClick={() => setPlanModalOpen(true)}>Meu Plano</button>
          <button className="btn btn-secondary btn-sm btn-full" onClick={openSettings}>Configurações</button>
          <button className="btn btn-secondary btn-sm btn-full" onClick={openChangePassword}>Alterar Senha</button>
          <button className="btn btn-secondary btn-sm btn-full" onClick={handleLogout}>Sair</button>
        </div>
      </aside>

      <PlanModal visible={planModalOpen} onClose={() => setPlanModalOpen(false)} />

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
        <p className="settings-hint">Esses valores são usados como padrão ao criar novas receitas.</p>
        <InvisibleCostField
          value={settingsForm.invisible_cost_pct}
          onChange={v => setSettingsForm(f => ({ ...f, invisible_cost_pct: v }))}
          error={settingsModal.state.errors.invisible_cost_pct?.[0]}
        />
        <ProfitMultiplierField
          value={settingsForm.profit_multiplier}
          onChange={v => setSettingsForm(f => ({ ...f, profit_multiplier: v }))}
          error={settingsModal.state.errors.profit_multiplier?.[0]}
        />
        <div className="form-group settings-toggle-group">
          <div className="settings-toggle-row">
            <div>
              <span className="settings-toggle-title">Desativar controle de estoque</span>
              <p className="multiplier-hint" style={{ marginTop: 2 }}>Ao produzir, o estoque dos ingredientes não será deduzido.</p>
            </div>
            <label className="switch">
              <input type="checkbox" checked={settingsForm.disable_stock_control}
                onChange={e => setSettingsForm(f => ({ ...f, disable_stock_control: e.target.checked }))} />
              <span className="switch-slider" />
            </label>
          </div>
        </div>
      </Modal>
    </>
  )
}
