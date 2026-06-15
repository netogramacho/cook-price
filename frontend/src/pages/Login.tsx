import { useState, useEffect } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { FormField } from '../components/ui/FormField'
import { AuthService } from '../services/AuthService'
import { useAppStore } from '../store/useAppStore'
import { logout } from '../lib/auth'

export function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { success, error } = useAppStore()
  const [form, setForm] = useState({ email: '', password: '' })

  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      logout()
      success('E-mail verificado com sucesso! Faça login para continuar.')
    }
  }, [])
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await AuthService.login(form)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      if (e.errors) setErrors(e.errors)
      else error(e.message ?? 'Erro ao fazer login.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo"><BrandLogo size={28} /> Preciva</h1>
        <p className="auth-subtitle">Bem-vindo de volta</p>
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="E-mail" error={errors.email?.[0]}>
            <input type="email" id="email" value={form.email} placeholder="seu@email.com" autoComplete="email"
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </FormField>
          <FormField label="Senha" error={errors.password?.[0]}>
            <input type="password" id="password" value={form.password} placeholder="••••••••" autoComplete="current-password"
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
          </FormField>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="auth-link">Não tem conta? <Link to="/register">Criar conta</Link></p>
        <p className="auth-link">Esqueceu a senha? <Link to="/forgot-password">Recuperar acesso</Link></p>
      </div>
    </div>
  )
}
