import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { FormField } from '../components/ui/FormField'
import { AuthService } from '../services/AuthService'
import { useAppStore } from '../store/useAppStore'

export function ResetPassword() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { success, error } = useAppStore()

  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''

  const [form, setForm] = useState({ password: '', password_confirmation: '' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    if (!token || !email) {
      error('Link de recuperação inválido. Solicite um novo.')
      return
    }

    setLoading(true)
    try {
      await AuthService.resetPassword({ token, email, ...form })
      success('Senha redefinida com sucesso!')
      navigate('/login')
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      if (e.errors) setErrors(e.errors)
      else error(e.message ?? 'Erro ao redefinir a senha.')
    } finally {
      setLoading(false)
    }
  }

  if (!token || !email) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <h1 className="auth-logo">🍳 CookPrice</h1>
          <p style={{ color: '#dc2626', textAlign: 'center', marginBottom: '16px' }}>
            Link de recuperação inválido ou expirado.
          </p>
          <p className="auth-link"><Link to="/forgot-password">Solicitar novo link</Link></p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">🍳 CookPrice</h1>
        <p className="auth-subtitle">Criar nova senha</p>
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Nova senha" error={errors.password?.[0]}>
            <input type="password" id="password" value={form.password} placeholder="Mínimo 8 caracteres"
              autoComplete="new-password" onChange={field('password')} />
          </FormField>
          <FormField label="Confirmar nova senha" error={errors.password_confirmation?.[0]}>
            <input type="password" id="password_confirmation" value={form.password_confirmation} placeholder="Repita a senha"
              autoComplete="new-password" onChange={field('password_confirmation')} />
          </FormField>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Redefinindo...' : 'Redefinir senha'}
          </button>
        </form>
        <p className="auth-link"><Link to="/login">Voltar para o login</Link></p>
      </div>
    </div>
  )
}
