import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { Tooltip } from '../components/ui/Tooltip'
import { AsyncState } from '../components/ui/AsyncState'
import { RecipeForm } from '../components/RecipeForm'
import { triggerPlanUpgrade } from '../lib/api'
import { getUser } from '../lib/auth'
import { RecipeService } from '../services/RecipeService'
import type { Recipe, RecipeIngredient } from '../services/RecipeService'
import { ProductService } from '../services/ProductService'
import { useAppStore } from '../store/useAppStore'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success, error } = useAppStore()

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)

  async function fetchRecipe() {
    setLoading(true); setLoadError(null)
    try { setRecipe(await RecipeService.getById(id!)) }
    catch (err) { setLoadError((err as { message?: string })?.message ?? 'Erro ao carregar receita. Tente novamente.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchRecipe() }, [id])

  const hasProducts = !!getUser()?.plan.has_products

  async function handleTransform() {
    if (!recipe) return
    if (!hasProducts) { triggerPlanUpgrade('O cadastro de produtos está disponível nos planos pagos.'); return }
    try {
      const product = await ProductService.fromRecipe(recipe.id)
      success(`Produto "${product.name}" pronto.`)
      navigate(`/produtos/${product.id}`)
    } catch {
      error('Erro ao transformar receita em produto.')
    }
  }

  const ingredients = (recipe?.ingredients ?? []) as RecipeIngredient[]
  const unpricedCount = ingredients.filter(i => Number(i.last_price) === 0).length

  // ---- Modo edição (inline) ----
  if (editing && recipe) {
    return (
      <div className="app-layout">
        <AppHeader />
        <main className="app-main">
          <div className="container container-narrow">
            <button type="button" className="back-link" onClick={() => setEditing(false)}>← Voltar para a receita</button>
            <h1 className="page-title">Editar Receita</h1>
            <RecipeForm
              initial={recipe}
              onSubmit={async (payload) => {
                const updated = await RecipeService.update(id!, payload)
                setRecipe(updated)
                success('Receita atualizada com sucesso.')
                setEditing(false)
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <a href="#" className="back-link" onClick={e => { e.preventDefault(); navigate('/recipes') }}>← Voltar para Receitas</a>

          <AsyncState loading={loading} error={loadError} onRetry={fetchRecipe} empty={false}>
            {recipe && (
              <>
                <div className="recipe-detail-header">
                  <div>
                    <h1 className="recipe-detail-title">{recipe.name}</h1>
                    {recipe.description && <p className="recipe-detail-desc">{String(recipe.description)}</p>}
                    <p className="recipe-meta">Rendimento: {fmtQuantity(recipe.yield)} {recipe.yield_unit}</p>
                  </div>
                  <div className="recipe-header-actions">
                    <button className="btn btn-primary" onClick={handleTransform}>{hasProducts ? 'Transformar em produto' : '🔒 Transformar em produto'}</button>
                    <button className="btn btn-secondary" onClick={() => setEditing(true)}>Editar</button>
                  </div>
                </div>

                <div className="info-note">
                  💡 Receitas mostram o <strong>custo de produção</strong>. Para definir o <strong>preço de venda</strong>, transforme em produto.
                </div>

                {unpricedCount > 0 && (
                  <div className="cost-warning">
                    <span>⚠️</span>
                    <span>{unpricedCount === 1 ? '1 ingrediente está' : `${unpricedCount} ingredientes estão`} sem preço cadastrado — o custo abaixo está incompleto. Cadastre o preço em <strong>Ingredientes</strong>.</span>
                  </div>
                )}

                <div className="cost-summary">
                  <div className="cost-item">
                    <label>Ingredientes</label>
                    <strong>R$ {fmtCurrency(recipe.ingredients_cost)}</strong>
                  </div>
                  {recipe.production_cost != null ? (
                    <>
                      {Number(recipe.invisible_cost_pct) > 0 && (
                        <div className="cost-item">
                          <div className="cost-item-label-row">
                            <label>Custos Invisíveis ({String(recipe.invisible_cost_pct)}%)</label>
                            <Tooltip content="Gastos indiretos que não aparecem nos ingredientes: gás, energia, água e mão de obra. Exemplo: com 15%, um custo base de R$ 20,00 adiciona R$ 3,00 ao custo de produção." />
                          </div>
                          <strong>R$ {fmtCurrency(recipe.invisible_cost as number)}</strong>
                        </div>
                      )}
                      <div className="cost-item">
                        <label>Custo de Produção</label>
                        <strong>R$ {fmtCurrency(recipe.production_cost as number)}</strong>
                      </div>
                      <div className="cost-item">
                        <label>Custo por {recipe.yield_unit}</label>
                        <strong>R$ {fmtCurrency(recipe.cost_per_yield as number)}</strong>
                      </div>
                    </>
                  ) : (
                    <div style={{ flexBasis: '100%' }}>
                      <div className="cost-locked" onClick={() => triggerPlanUpgrade()}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                        <div className="cost-locked-text">
                          <strong>Custo de produção e custo por porção</strong>
                          <span>Disponível nos planos pagos — veja o custo real, com custos invisíveis.</span>
                        </div>
                        <button className="btn btn-primary btn-sm">Fazer upgrade</button>
                      </div>
                    </div>
                  )}
                </div>

                <p className="section-title">Ingredientes</p>
                <div className="table-wrapper">
                  {ingredients.length === 0 ? (
                    <p className="empty-state">Nenhum ingrediente nesta receita.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr><th>Ingrediente</th><th>Unidade</th><th>Quantidade</th><th>Subtotal</th></tr>
                      </thead>
                      <tbody>
                        {ingredients.map(i => (
                          <tr key={i.id}>
                            <td>{i.name}</td>
                            <td>{i.unit}</td>
                            <td>{fmtQuantity(i.quantity)}</td>
                            <td>{Number(i.last_price) === 0 ? <span className="tag-no-price">Sem preço</span> : `R$ ${fmtCurrency(i.subtotal)}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </AsyncState>
        </div>
      </main>
    </div>
  )
}
