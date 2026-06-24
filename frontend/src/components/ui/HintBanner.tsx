import { useState } from 'react'

const HINTS: Record<string, string> = {
  ingredient: 'Cadastre seu primeiro ingrediente para começar a calcular os custos das suas receitas.',
  insumo: 'Cadastre seus insumos (embalagens, etiquetas, finalização) — eles entram na montagem dos produtos.',
  recipe: 'Crie sua primeira receita adicionando ingredientes e definindo o rendimento.',
  production: 'Para registrar uma produção, abra um produto e clique em Produzir.',
  product: 'Crie seu primeiro produto combinando receitas e insumos para definir o preço de venda.',
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
