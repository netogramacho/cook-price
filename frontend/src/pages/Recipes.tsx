import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { HintBanner } from '../components/ui/HintBanner'
import { useHintBanner } from '../hooks/useHintBanner'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchBar } from '../components/ui/SearchBar'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { RecipeForm } from '../components/RecipeForm'
import { RecipeService } from '../services/RecipeService'
import type { Recipe } from '../services/RecipeService'
import { ProductService } from '../services/ProductService'
import { useAppStore } from '../store/useAppStore'
import { triggerPlanUpgrade } from '../lib/api'
import { getUser } from '../lib/auth'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { fmtCurrency } from '../utils/formatters'

export function Recipes() {
  const hint = useHintBanner()
  const navigate = useNavigate()
  const { success, error } = useAppStore()

  const { items: recipes, hasMore, loading, loadingMore, loadError, search, handleSearch, loadMore, refetch } =
    usePaginatedList({
      fetchFn: (page, q) => RecipeService.getPaginated(page, q),
      onError: error,
      loadMoreErrorMsg: 'Erro ao carregar mais receitas.',
    })

  const [view, setView] = useState<'list' | 'form'>('list')
  const hasProducts = !!getUser()?.plan.has_products

  const deleteRecipe = useConfirmAction<Recipe>({
    onConfirm: async (item) => {
      await RecipeService.delete(item.id)
      success('Receita excluída.')
      refetch()
    },
    onError: error,
  })

  async function handleTransform(recipe: Recipe) {
    if (!hasProducts) { triggerPlanUpgrade('O cadastro de produtos está disponível nos planos pagos.'); return }
    try {
      const product = await ProductService.fromRecipe(recipe.id)
      success(`Produto "${product.name}" pronto.`)
      navigate(`/produtos/${product.id}`)
    } catch {
      error('Erro ao transformar receita em produto.')
    }
  }

  async function handleDuplicate(id: string) {
    try {
      const copy = await RecipeService.duplicate(id)
      success(`"${copy.name}" criada.`)
      refetch()
    } catch {
      error('Erro ao duplicar receita.')
    }
  }

  // ---- View: formulário de criação ----
  if (view === 'form') {
    return (
      <div className="app-layout">
        <AppHeader />
        <main className="app-main">
          <div className="container container-narrow">
            <button type="button" className="back-link" onClick={() => setView('list')}>← Voltar para Receitas</button>
            <h1 className="page-title">Nova Receita</h1>
            <RecipeForm
              onSubmit={async (payload) => {
                await RecipeService.create(payload)
                success('Receita criada com sucesso.')
                setView('list')
                refetch()
              }}
              onCancel={() => setView('list')}
            />
          </div>
        </main>
      </div>
    )
  }

  // ---- View: listagem ----
  return (
    <div className="app-layout">
      <AppHeader />
      <main className="app-main">
        <div className="container">
          <PageHeader title="Receitas" actionLabel="+ Nova Receita" onAction={() => setView('form')} />
          <SearchBar placeholder="Buscar receita..." value={search} onChange={handleSearch} />
          <HintBanner hint={hint} />

          <AsyncState loading={loading} error={loadError || null} onRetry={refetch}
            empty={!recipes.length} emptyEntityName="receita" emptySearch={search}
            emptyAction={{ label: '+ Nova Receita', onClick: () => setView('form') }}>
            <>
              {recipes.map(r => (
                <div key={r.id} className="recipe-card">
                  <div className="recipe-info">
                    <strong>{r.name}</strong>
                    <span>
                      Custo base: R$ {fmtCurrency(r.base_cost)}
                      {r.cost_per_yield != null && (
                        <>&nbsp;·&nbsp;Por {r.yield_unit}: R$ {fmtCurrency(r.cost_per_yield)}</>
                      )}
                    </span>
                  </div>
                  <div className="recipe-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => handleTransform(r)}>{hasProducts ? 'Transformar em produto' : '🔒 Transformar em produto'}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/recipes/${r.id}`)}>Ver</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => handleDuplicate(r.id)}>Duplicar</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteRecipe.open(r)}>Excluir</button>
                  </div>
                </div>
              ))}
              <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />
            </>
          </AsyncState>
        </div>
      </main>

      <ConfirmModal
        visible={deleteRecipe.confirm.visible}
        title="Excluir Receita"
        message={<>Excluir <strong>{deleteRecipe.confirm.item?.name}</strong>? Esta ação não pode ser desfeita.</>}
        loading={deleteRecipe.confirm.loading}
        confirmText="Excluir"
        onConfirm={deleteRecipe.execute}
        onClose={deleteRecipe.close}
      />
    </div>
  )
}
