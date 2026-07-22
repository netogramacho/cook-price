import { useState } from 'react'
import { ConfirmModal } from './ui/ConfirmModal'
import { NumericInput } from './ui/NumericInput'
import { SalesChannelModal } from './SalesChannelModal'
import { ProductService } from '../services/ProductService'
import type { Product, ProductSalesChannelLine } from '../services/ProductService'
import { SalesChannelService } from '../services/SalesChannelService'
import { useConfirmAction } from '../hooks/useConfirmAction'
import { useAppStore } from '../store/useAppStore'
import { fmtCurrency, fmtQuantity } from '../utils/formatters'
import { parseDecimal } from '../utils/inputs'

interface Props {
  product: Product
  /** Recebe o produto já recalculado após salvar um preço manual. */
  onProductUpdated: (product: Product) => void
  /** Recarrega o produto após criar/editar/remover um app (a taxa muda todos os preços). */
  onRefetch: () => void
}

export function ProductChannelPrices({ product, onProductUpdated, onRefetch }: Props) {
  const { success, error } = useAppStore()

  const [channelModal, setChannelModal] = useState<{ visible: boolean; channel: ProductSalesChannelLine | null }>({ visible: false, channel: null })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [priceInput, setPriceInput] = useState('')
  const [saving, setSaving] = useState(false)

  const removeChannel = useConfirmAction<ProductSalesChannelLine>({
    onConfirm: async (channel) => {
      await SalesChannelService.delete(channel.id)
      success('Aplicativo removido.')
      onRefetch()
    },
    onError: error,
  })

  /**
   * O endpoint substitui a lista inteira de preços manuais, então reenviamos
   * todos os canais que já tinham preço fixado com o ajuste da linha editada.
   */
  async function savePrice(channel_id: string, custom_price: number | null) {
    setSaving(true)
    try {
      const prices = product.sales_channels
        .filter(c => c.custom_price !== null && c.id !== channel_id)
        .map(c => ({ sales_channel_id: c.id, custom_price: c.custom_price }))

      if (custom_price !== null) prices.push({ sales_channel_id: channel_id, custom_price })

      onProductUpdated(await ProductService.updateChannelPrices(product.id, prices))
      success(custom_price === null ? 'Preço voltou ao calculado.' : 'Preço atualizado.')
      setEditingId(null)
    } catch (err) {
      error((err as { message?: string })?.message ?? 'Erro ao salvar preço.')
    } finally {
      setSaving(false)
    }
  }

  function startEdit(channel: ProductSalesChannelLine) {
    setEditingId(channel.id)
    setPriceInput(fmtCurrency(channel.price))
  }

  return (
    <>
      <div className="form-section-header" style={{ marginTop: 24 }}>
        <p className="section-title" style={{ marginBottom: 0 }}>Preço nos aplicativos</p>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => setChannelModal({ visible: true, channel: null })}>
          + Adicionar app
        </button>
      </div>

      <div className="table-wrapper">
        {product.sales_channels.length === 0 ? (
          <p className="empty-state">
            Nenhum aplicativo cadastrado. Adicione iFood, 99Food ou outro app para ver o preço que cobre a taxa cobrada por ele.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>App</th><th>Taxa</th><th>Preço no app</th><th>Você recebe</th><th>Margem</th><th></th>
              </tr>
            </thead>
            <tbody>
              {product.sales_channels.map(channel => (
                <tr key={channel.id}>
                  <td>{channel.name}</td>
                  <td>{fmtQuantity(channel.fee_pct)}%</td>
                  <td>
                    {editingId === channel.id ? (
                      <div className="channel-price-edit">
                        <NumericInput value={priceInput} placeholder={fmtCurrency(channel.calculated_price)}
                          onChange={setPriceInput} />
                        <button type="button" className="btn btn-primary btn-sm" disabled={saving}
                          onClick={() => savePrice(channel.id, parseDecimal(priceInput))}>Salvar</button>
                        <button type="button" className="btn btn-secondary btn-sm" disabled={saving}
                          onClick={() => setEditingId(null)}>Cancelar</button>
                        {channel.custom_price !== null && (
                          <button type="button" className="btn btn-secondary btn-sm" disabled={saving}
                            onClick={() => savePrice(channel.id, null)}>Usar calculado</button>
                        )}
                      </div>
                    ) : (
                      <>
                        R$ {fmtCurrency(channel.price)}
                        {channel.custom_price !== null && <span className="badge badge-packaging" style={{ marginLeft: 6 }}>manual</span>}
                      </>
                    )}
                  </td>
                  <td>R$ {fmtCurrency(channel.net_price)}</td>
                  <td>
                    {Number(channel.net_price) <= Number(product.cost_per_yield)
                      ? <span className="tag-no-price">prejuízo</span>
                      : `${fmtQuantity(channel.margin_pct)}%`}
                  </td>
                  <td className="channel-row-actions">
                    {editingId !== channel.id && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => startEdit(channel)}>Preço</button>
                    )}
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setChannelModal({ visible: true, channel })}>Taxa</button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeChannel.open(channel)}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="multiplier-hint">
        O preço no app já embute a taxa: depois do desconto do aplicativo, o valor que sobra é o seu preço sugerido.
      </p>

      <SalesChannelModal
        visible={channelModal.visible}
        channel={channelModal.channel}
        onSaved={() => { setChannelModal({ visible: false, channel: null }); onRefetch() }}
        onClose={() => setChannelModal({ visible: false, channel: null })}
      />

      <ConfirmModal
        visible={removeChannel.confirm.visible}
        title="Remover aplicativo"
        message={<>Remover <strong>{removeChannel.confirm.item?.name}</strong>? Ele deixa de aparecer em todos os produtos.</>}
        loading={removeChannel.confirm.loading}
        confirmText="Remover"
        onConfirm={removeChannel.execute}
        onClose={removeChannel.close}
      />
    </>
  )
}
