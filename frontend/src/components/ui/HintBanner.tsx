import { useState } from 'react'

const HINTS: Record<string, string> = {
  ingredient: 'Cadastre seu primeiro ingrediente para começar a calcular os custos das suas receitas.',
  recipe: 'Crie sua primeira receita adicionando ingredientes e definindo o rendimento.',
  production: 'Para registrar uma produção, abra uma receita e clique em Produzir.',
}

export function HintBanner({ hint }: { hint: string | null }) {
  const [dismissed, setDismissed] = useState(false)
  const message = hint ? HINTS[hint] : null
  if (!message || dismissed) return null

  return (
    <div className="hint-banner" role="status">
      <span className="hint-banner-icon">💡</span>
      <p className="hint-banner-text">{message}</p>
      <button className="hint-banner-close" onClick={() => setDismissed(true)} aria-label="Fechar dica">✕</button>
    </div>
  )
}
