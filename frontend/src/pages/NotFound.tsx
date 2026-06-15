import { Link } from 'react-router-dom'
import { isAuthenticated, isEmailVerified } from '../lib/auth'

export function NotFound() {
  const homeLink = !isAuthenticated()
    ? '/login'
    : !isEmailVerified()
      ? '/verify-email'
      : '/dashboard'

  return (
    <div className="auth-container">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h1 className="auth-logo"><BrandLogo size={28} /> Preciva</h1>
        <p style={{ fontSize: '64px', margin: '16px 0 8px', lineHeight: 1 }}>404</p>
        <p className="auth-subtitle" style={{ marginBottom: '8px' }}>Página não encontrada</p>
        <p style={{ color: '#666', fontSize: '14px', marginBottom: '24px' }}>
          O endereço que você acessou não existe.
        </p>
        <Link to={homeLink} className="btn btn-primary" style={{ display: 'inline-block' }}>
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
