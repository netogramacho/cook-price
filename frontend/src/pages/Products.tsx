import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppHeader } from '../components/AppHeader'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchBar } from '../components/ui/SearchBar'
import { AsyncState } from '../components/ui/AsyncState'
import { LoadMoreButton } from '../components/ui/LoadMoreButton'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { ProductForm } from '../components/ProductForm'
import { ProduceModal } from '../components/ProduceModal'
import { ProductService } from '../services/ProductService'
import type { Product } from '../services/ProductService'
import { useAppStore } from '../store/useAppStore'
import { getUser } from '../lib/auth'
import { triggerPlanUpgrade } from '../lib/api'
import { usePaginatedList } from '../hooks/usePaginatedList'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { fmtCurrency } from '../utils/formatters'

export function Products() {
  const navigate = useNavigate()
  const { success, error } = useAppStore()
  const hasProd = !!getUser()?.plan.has_production

  const { items: products, hasMore, loading, loadingMore, loadError, search, handleSearch, loadMore, refetch } =
    usePaginatedList({
      fetchFn: (page, q) => ProductService.getPaginated(page, q),
      onError: error,
      loadMoreErrorMsg: 'Erro ao carregar mais produtos.',
    })

  const [view, setView] = useState<'list' | 'form'>('list')
  const [produceProduct, setProduceProduct] = useState<Product | null>(null)

  const deleteProduct = useConfirmAction<Product>({
    onConfirm: async (item) => {
      await ProductService.delete(item.id)
      success('Produto excluído.')
      refetch()
    },
    onError: error,
  })

  // ---- View: formulário de criação ----
  if (view === 'form') {
    return (
      <div className="app-layout">
        <AppHeader />
        <main className="app-main">
          <div className="container container-narrow">
            <button type="button" className="back-link" onClick={() => setView('list')}>← Voltar para Produtos</button>
            <h1 className="page-title">Novo Produto</h1>
            <ProductForm
              onSubmit={async (payload) => {
                await ProductService.create(payload)
                success('Produto criado com sucesso.')
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
          <PageHeader title="Produtos" actionLabel="+ Novo Produto" onAction={() => setView('form')} />
          <SearchBar placeholder="Buscar produto..." value={search} onChange={handleSearch} />

          <AsyncState loading={loading} error={loadError || null} onRetry={refetch}
            empty={!products.length} emptyEntityName="produto" emptySearch={search}
            emptyMessage="Produtos são o que você vende: combine receitas + insumos e defina a margem para ver o preço sugerido."
            emptyAction={{ label: '+ Novo Produto', onClick: () => setView('form') }}>
            <>
              {products.map(p => (
                <div key={p.id} className="recipe-card">
                  <div className="recipe-info">
                    <strong>{p.name}</strong>
                    <span>
                      Custo: R$ {fmtCurrency(p.production_cost)}
                      {p.suggested_price_per_yield != null && (
                        <>&nbsp;·&nbsp;Preço sugerido/{p.yield_unit}: R$ {fmtCurrency(p.suggested_price_per_yield)}</>
                      )}
                    </span>
                  </div>
                  <div className="recipe-actions">
                    <button className="btn btn-primary btn-sm" onClick={() => hasProd ? setProduceProduct(p) : triggerPlanUpgrade('O registro de produções está disponível nos planos pagos.')}>{hasProd ? 'Produzir' : '🔒 Produzir'}</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate(`/produtos/${p.id}`)}>Ver</button>
                    <button className="btn btn-danger btn-sm" onClick={() => deleteProduct.open(p)}>Excluir</button>
                  </div>
                </div>
              ))}
              <LoadMoreButton hasMore={hasMore} loading={loadingMore} onLoadMore={loadMore} />
            </>
          </AsyncState>
        </div>
      </main>

      <ProduceModal
        product={produceProduct}
        onClose={() => setProduceProduct(null)}
        onSuccess={() => setProduceProduct(null)}
      />

      <ConfirmModal
        visible={deleteProduct.confirm.visible}
        title="Excluir Produto"
        message={<>Excluir <strong>{deleteProduct.confirm.item?.name}</strong>? Esta ação não pode ser desfeita.</>}
        loading={deleteProduct.confirm.loading}
        confirmText="Excluir"
        onConfirm={deleteProduct.execute}
        onClose={deleteProduct.close}
      />
    </div>
  )
}
