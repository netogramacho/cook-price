import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { AsyncState } from '../components/ui/AsyncState'
import { ProductForm } from '../components/ProductForm'
import { ProduceModal } from '../components/ProduceModal'
import { getUser } from '../lib/auth'
import { triggerPlanUpgrade } from '../lib/api'
import { ProductService } from '../services/ProductService'
import type { Product } from '../services/ProductService'
import { useAppStore } from '../store/useAppStore'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'

export function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { success } = useAppStore()

  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [produceOpen, setProduceOpen] = useState(false)
  const [editing, setEditing] = useState(false)

  const hasProd = !!getUser()?.plan.has_production

  async function fetchProduct() {
    setLoading(true); setLoadError(null)
    try { setProduct(await ProductService.getById(id!)) }
    catch (err) { setLoadError((err as { message?: string })?.message ?? 'Erro ao carregar produto. Tente novamente.') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchProduct() }, [id])

  const unpricedCount = product
    ? product.ingredients.filter(i => Number(i.last_price) === 0).length
      + product.insumos.filter(i => Number(i.last_price) === 0).length
      + product.recipes.filter(r => Number(r.recipe_cost) === 0).length
    : 0

  // ---- Modo edição (inline) ----
  if (editing && product) {
    return (
      <div className="app-layout">
        <AppHeader />
        <main className="app-main">
          <div className="container container-narrow">
            <button type="button" className="back-link" onClick={() => setEditing(false)}>← Voltar para o produto</button>
            <h1 className="page-title">Editar Produto</h1>
            <ProductForm
              initial={product}
              onSubmit={async (payload) => {
                const updated = await ProductService.update(id!, payload)
                setProduct(updated)
                success('Produto atualizado com sucesso.')
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
          <a href="#" className="back-link" onClick={e => { e.preventDefault(); navigate('/produtos') }}>← Voltar para Produtos</a>

          <AsyncState loading={loading} error={loadError} onRetry={fetchProduct} empty={false}>
            {product && (
              <>
                <div className="recipe-detail-header">
                  <div>
                    <h1 className="recipe-detail-title">{product.name}</h1>
                    {product.description && <p className="recipe-detail-desc">{String(product.description)}</p>}
                    <p className="recipe-meta">Rendimento: {fmtQuantity(product.yield)} {product.yield_unit}</p>
                  </div>
                  <div className="recipe-header-actions">
                    <button className="btn btn-primary" onClick={() => hasProd ? setProduceOpen(true) : triggerPlanUpgrade('O registro de produções está disponível nos planos pagos.')}>{hasProd ? 'Produzir' : '🔒 Produzir'}</button>
                    <button className="btn btn-secondary" onClick={() => setEditing(true)}>Editar</button>
                  </div>
                </div>

                {unpricedCount > 0 && (
                  <div className="cost-warning">
                    <span>⚠️</span>
                    <span>{unpricedCount === 1 ? '1 item está' : `${unpricedCount} itens estão`} sem preço (receita, ingrediente ou insumo) — o custo e o preço sugerido abaixo estão incompletos.</span>
                  </div>
                )}

                <div className="cost-summary">
                  <div className="cost-item">
                    <label>Receitas</label>
                    <strong>R$ {fmtCurrency(product.recipes_cost)}</strong>
                  </div>
                  {Number(product.ingredients_cost) > 0 && (
                    <div className="cost-item">
                      <label>Ingredientes</label>
                      <strong>R$ {fmtCurrency(product.ingredients_cost)}</strong>
                    </div>
                  )}
                  <div className="cost-item">
                    <label>Insumos</label>
                    <strong>R$ {fmtCurrency(product.insumos_cost)}</strong>
                  </div>
                  {Number(product.invisible_cost_pct) > 0 && (
                    <div className="cost-item">
                      <label>Custos de Finalização ({String(product.invisible_cost_pct)}%)</label>
                      <strong>R$ {fmtCurrency(product.invisible_cost)}</strong>
                    </div>
                  )}
                  <div className="cost-item">
                    <label>Custo de Produção</label>
                    <strong>R$ {fmtCurrency(product.production_cost)}</strong>
                  </div>
                  <div className="cost-item">
                    <label>Custo por {product.yield_unit}</label>
                    <strong>R$ {fmtCurrency(product.cost_per_yield)}</strong>
                  </div>
                  <div style={{ flexBasis: '100%' }}>
                    <div className="cost-item cost-item-highlight">
                      <label>Preço Sugerido / {product.yield_unit} ({String(product.profit_multiplier)}x · margem {String(product.profit_margin_pct)}%)</label>
                      <strong>R$ {fmtCurrency(product.suggested_price_per_yield)}</strong>
                    </div>
                  </div>
                </div>

                <p className="section-title">Receitas</p>
                <div className="table-wrapper">
                  {product.recipes.length === 0 ? (
                    <p className="empty-state">Nenhuma receita neste produto.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr><th>Receita</th><th>Custo/receita</th><th>Receitas</th><th>Subtotal</th><th></th></tr>
                      </thead>
                      <tbody>
                        {product.recipes.map(r => (
                          <tr key={r.id}>
                            <td>{r.name}</td>
                            <td>{Number(r.recipe_cost) === 0 ? <span className="tag-no-price">Sem preço</span> : `R$ ${fmtCurrency(r.recipe_cost)}`}</td>
                            <td>{fmtQuantity(r.quantity)}</td>
                            <td>R$ {fmtCurrency(r.subtotal)}</td>
                            <td>
                              <Link className="btn btn-secondary btn-sm" to={`/recipes/${r.id}`}>Ver receita</Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {product.ingredients.length > 0 && (
                  <>
                    <p className="section-title">Ingredientes avulsos</p>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr><th>Ingrediente</th><th>Unidade</th><th>Quantidade</th><th>Subtotal</th></tr>
                        </thead>
                        <tbody>
                          {product.ingredients.map(i => (
                            <tr key={i.id}>
                              <td>{i.name}</td>
                              <td>{i.unit}</td>
                              <td>{fmtQuantity(i.quantity)}</td>
                              <td>{Number(i.last_price) === 0 ? <span className="tag-no-price">Sem preço</span> : `R$ ${fmtCurrency(i.subtotal)}`}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                <p className="section-title">Insumos</p>
                <div className="table-wrapper">
                  {product.insumos.length === 0 ? (
                    <p className="empty-state">Nenhum insumo neste produto.</p>
                  ) : (
                    <table>
                      <thead>
                        <tr><th>Insumo</th><th>Unidade</th><th>Quantidade</th><th>Subtotal</th></tr>
                      </thead>
                      <tbody>
                        {product.insumos.map(i => (
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

      <ProduceModal
        product={produceOpen ? product : null}
        onClose={() => setProduceOpen(false)}
        onSuccess={() => { setProduceOpen(false); fetchProduct() }}
      />
    </div>
  )
}
