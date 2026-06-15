import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { FormField } from '../components/ui/FormField'
import { AuthService } from '../services/AuthService'
import { useAppStore } from '../store/useAppStore'

export function Register() {
  const navigate = useNavigate()
  const { error } = useAppStore()
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password_confirmation: '' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    if (form.password !== form.password_confirmation) {
      setErrors({ password_confirmation: ['As senhas não conferem.'] })
      return
    }

    setLoading(true)
    try {
      await AuthService.register(form)
      navigate('/dashboard')
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      if (e.errors) setErrors(e.errors)
      else error(e.message ?? 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  const field = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }))

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo"><BrandLogo size={28} /> Preciva</h1>
        <p className="auth-subtitle">Criar conta</p>
        <form onSubmit={handleSubmit} noValidate>
          <FormField label="Nome" error={errors.name?.[0]}>
            <input type="text" id="name" value={form.name} placeholder="Seu nome" autoComplete="name" onChange={field('name')} />
          </FormField>
          <FormField label="E-mail" error={errors.email?.[0]}>
            <input type="email" id="email" value={form.email} placeholder="seu@email.com" autoComplete="email" onChange={field('email')} />
          </FormField>
          <FormField label="Telefone" error={errors.phone?.[0]}>
            <input type="tel" id="phone" value={form.phone} placeholder="(11) 99999-9999" autoComplete="tel" onChange={field('phone')} />
          </FormField>
          <FormField label="Senha" error={errors.password?.[0]}>
            <input type="password" id="password" value={form.password} placeholder="Mínimo 8 caracteres" autoComplete="new-password" onChange={field('password')} />
          </FormField>
          <FormField label="Confirmar senha" error={errors.password_confirmation?.[0]}>
            <input type="password" id="password_confirmation" value={form.password_confirmation} placeholder="Repita a senha" autoComplete="new-password" onChange={field('password_confirmation')} />
          </FormField>
          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>
        <p className="auth-link">Já tem conta? <Link to="/login">Entrar</Link></p>
      </div>
    </div>
  )
}
