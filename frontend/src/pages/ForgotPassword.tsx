import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FormField } from '../components/ui/FormField'
import { AuthService } from '../services/AuthService'
import { useAppStore } from '../store/useAppStore'

export function ForgotPassword() {
  const { error } = useAppStore()
  const [email, setEmail] = useState('')
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await AuthService.forgotPassword(email)
      setSent(true)
    } catch (err: unknown) {
      const e = err as { errors?: Record<string, string[]>; message?: string }
      if (e.errors) setErrors(e.errors)
      else error(e.message ?? 'Erro ao enviar o e-mail de recuperação.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-logo">🍳 CookPrice</h1>
        <p className="auth-subtitle">Recuperar senha</p>
        {sent ? (
          <>
            <p style={{ color: '#16a34a', textAlign: 'center', marginBottom: '16px' }}>
              Se este e-mail estiver cadastrado, você receberá as instruções de recuperação em breve.
            </p>
            <p className="auth-link"><Link to="/login">Voltar para o login</Link></p>
          </>
        ) : (
          <>
            <p style={{ color: '#666', fontSize: '14px', marginBottom: '16px', textAlign: 'center' }}>
              Informe seu e-mail e enviaremos um link para redefinir sua senha.
            </p>
            <form onSubmit={handleSubmit} noValidate>
              <FormField label="E-mail" error={errors.email?.[0]}>
                <input type="email" id="email" value={email} placeholder="seu@email.com" autoComplete="email"
                  onChange={e => setEmail(e.target.value)} />
              </FormField>
              <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </button>
            </form>
            <p className="auth-link"><Link to="/login">Voltar para o login</Link></p>
          </>
        )}
      </div>
    </div>
  )
}
