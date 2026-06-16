import { BrandLogo } from '../components/BrandLogo'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { AuthService } from '../services/AuthService'
import { useAppStore } from '../store/useAppStore'
import { getUser } from '../lib/auth'

export function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const { success, error } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const user = getUser()

  useEffect(() => {
    if (searchParams.get('error')) {
      error('Link de verificação inválido ou expirado. Solicite um novo abaixo.')
    }
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function handleResend() {
    setLoading(true)
    try {
      await AuthService.resendVerification()
      success('E-mail de confirmação reenviado com sucesso!')
      setCooldown(60)
    } catch (err: unknown) {
      const e = err as { message?: string }
      error(e.message ?? 'Erro ao reenviar o e-mail.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogout() {
    await AuthService.logout()
    window.location.href = '/login'
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo"><BrandLogo height={90} variant="bordo" /></div>
        <p className="auth-subtitle">Verifique seu e-mail</p>
        <p style={{ color: '#666', fontSize: '14px', textAlign: 'center', marginBottom: '8px' }}>
          Enviamos um link de confirmação para:
        </p>
        <p style={{ fontWeight: 600, textAlign: 'center', marginBottom: '24px', color: '#2c2c2c' }}>
          {user?.email}
        </p>
        <p style={{ color: '#666', fontSize: '13px', textAlign: 'center', marginBottom: '24px' }}>
          Clique no link do e-mail para ativar sua conta. Não encontrou? Verifique a pasta de spam.
        </p>
        <button
          className="btn btn-primary btn-full"
          onClick={handleResend}
          disabled={loading || cooldown > 0}
        >
          {loading ? 'Reenviando...' : cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar e-mail de confirmação'}
        </button>
        <p className="auth-link" style={{ marginTop: '16px' }}>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', padding: 0 }}
          >
            Sair da conta
          </button>
        </p>
      </div>
    </div>
  )
}
