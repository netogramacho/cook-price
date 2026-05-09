const StockPage = {
    name: 'StockPage',
    components: { AppHeader, AppModal, IngredientAutocomplete },
    mixins: [FormattersMixin, InputsMixin],
    data() {
        return {
            items: [],
            currentPage: 1,
            hasMore: false,
            loading: true,
            loadingMore: false,
            loadError: false,
            search: '',
            debounceTimer: null,
            allIngredients: [],

            purchaseModal: {
                visible: false,
                loading: false,
                errors: {},
                form: { purchased_at: '', notes: '' },
                rows: [{ ingredient_id: '', package_size: '', num_packages: '', total_price: '' }],
            },

            adjustModal: {
                visible: false,
                loading: false,
                errors: {},
                ingredient: null,
                form: { stock_quantity: '', movement_date: '', notes: '' },
            },

            historyModal: {
                visible: false,
                loading: false,
                ingredient: null,
                movements: [],
                currentPage: 1,
                hasMore: false,
                loadingMore: false,
            },
        };
    },
    async created() {
        await this.fetchStock();
    },
    watch: {
        search() {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.fetchStock(), 300);
        },
    },
    methods: {
        async fetchStock() {
            this.loading = true;
            this.loadError = false;
            this.items = [];
            this.currentPage = 1;
            try {
                const { items, meta } = await StockService.getPaginated(1, this.search.trim());
                this.items       = items;
                this.currentPage = meta.current_page;
                this.hasMore     = meta.current_page < meta.last_page;
            } catch (_) {
                this.loadError = true;
            } finally {
                this.loading = false;
            }
        },

        async loadMore() {
            this.loadingMore = true;
            try {
                const { items, meta } = await StockService.getPaginated(this.currentPage + 1, this.search.trim());
                this.items.push(...items);
                this.currentPage = meta.current_page;
                this.hasMore     = meta.current_page < meta.last_page;
            } catch (_) {
                store.error('Erro ao carregar mais itens.');
            } finally {
                this.loadingMore = false;
            }
        },

        fmtRefPrice(item) {
            if (!item.last_price || !item.package_size) return '—';
            return 'R$ ' + this.fmtCurrency(item.last_price)
                + ' / ' + this.fmtQuantity(item.package_size) + ' ' + item.unit;
        },

        // Purchase modal
        async openPurchaseModal() {
            try {
                this.allIngredients = await IngredientService.getAll();
            } catch (_) {
                store.error('Erro ao carregar ingredientes.');
                return;
            }
            this.purchaseModal.form   = { purchased_at: '', notes: '' };
            this.purchaseModal.rows   = [{ ingredient_id: '', package_size: '', num_packages: '', total_price: '' }];
            this.purchaseModal.errors = {};
            this.purchaseModal.visible = true;
        },

        onIngredientSelect(row, id) {
            row.ingredient_id = id;
            const ing = this.allIngredients.find(i => i.id === id);
            if (ing) row.package_size = this.fmtQuantity(ing.package_size);
        },

        getIngredientUnit(id) {
            return this.allIngredients.find(i => i.id === id)?.unit ?? '';
        },

        pricePerPackage(row) {
            const pkgs  = this.parseDecimal(row.num_packages);
            const total = this.parseDecimal(row.total_price);
            if (!pkgs || !total || isNaN(pkgs) || isNaN(total)) return null;
            return total / pkgs;
        },

        purchaseTotalValue() {
            return this.purchaseModal.rows.reduce((sum, row) => {
                const val = this.parseDecimal(row.total_price);
                return sum + (isNaN(val) ? 0 : val);
            }, 0);
        },

        addPurchaseRow() {
            this.purchaseModal.rows.push({ ingredient_id: '', package_size: '', num_packages: '', total_price: '' });
        },

        removePurchaseRow(index) {
            this.purchaseModal.rows.splice(index, 1);
        },

        async savePurchase() {
            this.purchaseModal.loading = true;
            this.purchaseModal.errors = {};
            try {
                const items = this.purchaseModal.rows
                    .filter(r => r.ingredient_id && r.package_size && r.num_packages && r.total_price)
                    .map(r => ({
                        ingredient_id: r.ingredient_id,
                        package_size:  this.parseDecimal(r.package_size),
                        num_packages:  this.parseDecimal(r.num_packages),
                        total_price:   this.parseDecimal(r.total_price),
                    }));

                await StockService.createPurchase({
                    purchased_at: this.purchaseModal.form.purchased_at || null,
                    notes:        this.purchaseModal.form.notes.trim() || null,
                    items,
                });
                store.success('Compra registrada com sucesso.');
                this.purchaseModal.visible = false;
                await this.fetchStock();
            } catch (err) {
                this.purchaseModal.errors = err.errors || {};
                if (!err.errors) store.error(err.message || 'Erro ao registrar compra.');
            } finally {
                this.purchaseModal.loading = false;
            }
        },

        // Adjust modal
        openAdjustModal(item) {
            this.adjustModal.ingredient = item;
            this.adjustModal.form = {
                stock_quantity: this.fmtQuantity(item.stock_quantity),
                movement_date:  '',
                notes:          '',
            };
            this.adjustModal.errors = {};
            this.adjustModal.visible = true;
        },

        async saveAdjust() {
            this.adjustModal.loading = true;
            this.adjustModal.errors = {};
            try {
                const data = {
                    stock_quantity: this.parseDecimal(this.adjustModal.form.stock_quantity),
                    movement_date:  this.adjustModal.form.movement_date || null,
                    notes:          this.adjustModal.form.notes.trim() || null,
                };
                const updated = await StockService.adjust(this.adjustModal.ingredient.id, data);
                store.success('Estoque ajustado com sucesso.');
                this.adjustModal.visible = false;
                const index = this.items.findIndex(i => i.id === this.adjustModal.ingredient.id);
                if (index !== -1) {
                    this.items[index].stock_quantity = updated.stock_quantity;
                }
            } catch (err) {
                this.adjustModal.errors = err.errors || {};
                if (!err.errors) store.error(err.message || 'Erro ao ajustar estoque.');
            } finally {
                this.adjustModal.loading = false;
            }
        },

        // History modal
        async openHistoryModal(item) {
            this.historyModal.ingredient  = item;
            this.historyModal.movements   = [];
            this.historyModal.currentPage = 1;
            this.historyModal.hasMore     = false;
            this.historyModal.loading     = true;
            this.historyModal.visible     = true;
            try {
                const { items, meta } = await StockService.getMovements(item.id, 1);
                this.historyModal.movements   = items;
                this.historyModal.currentPage = meta.current_page;
                this.historyModal.hasMore     = meta.current_page < meta.last_page;
            } catch (_) {
                store.error('Erro ao carregar histórico.');
            } finally {
                this.historyModal.loading = false;
            }
        },

        async loadMoreHistory() {
            this.historyModal.loadingMore = true;
            try {
                const { items, meta } = await StockService.getMovements(
                    this.historyModal.ingredient.id,
                    this.historyModal.currentPage + 1
                );
                this.historyModal.movements.push(...items);
                this.historyModal.currentPage = meta.current_page;
                this.historyModal.hasMore     = meta.current_page < meta.last_page;
            } catch (_) {
                store.error('Erro ao carregar mais movimentos.');
            } finally {
                this.historyModal.loadingMore = false;
            }
        },

        movementTypeLabel(type) {
            if (type === 'purchase')   return 'Compra';
            if (type === 'production') return 'Produção';
            return 'Ajuste';
        },

        movementDate(m) {
            const d = m.movement_date || m.purchase?.purchased_at || m.created_at;
            if (!d) return '—';
            return new Date(d).toLocaleDateString('pt-BR');
        },
    },
    template: `
        <div class="app-layout">
            <app-header active-page="stock" />
            <main class="app-main">
                <div class="container">
                    <div class="page-header">
                        <h1>Estoque</h1>
                        <button class="btn btn-primary" @click="openPurchaseModal">+ Registrar Compra</button>
                    </div>

                    <div class="stock-filters">
                        <input type="text" v-model="search" placeholder="Buscar ingrediente..." class="search-input">
                    </div>

                    <div v-if="loading" class="loading">Carregando...</div>
                    <div v-else-if="loadError" class="error-state">Erro ao carregar estoque.</div>
                    <p v-else-if="!items.length" class="empty-state">
                        {{ search ? 'Nenhum item encontrado para "' + search + '".' : 'Nenhum ingrediente cadastrado ainda.' }}
                    </p>
                    <template v-else>
                        <div class="table-wrapper">
                            <table class="stock-table">
                                <thead>
                                    <tr>
                                        <th>Nome</th>
                                        <th>Tipo</th>
                                        <th>Estoque</th>
                                        <th>
                                            Preço / pacote
                                            <span class="help-icon" title="Custo Médio Móvel: média ponderada do custo histórico de compras deste ingrediente">ⓘ</span>
                                        </th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="item in items" :key="item.id">
                                        <td>{{ item.name }}</td>
                                        <td>
                                            <span :class="item.type === 'packaging' ? 'badge badge-packaging' : 'badge badge-ingredient'">
                                                {{ item.type === 'packaging' ? 'Embalagem' : 'Ingrediente' }}
                                            </span>
                                        </td>
                                        <td>{{ fmtQuantity(item.stock_quantity) }} {{ item.unit }}</td>
                                        <td>{{ fmtRefPrice(item) }}</td>
                                        <td>
                                            <div class="td-actions">
                                                <button class="btn btn-secondary btn-sm" @click="openAdjustModal(item)">Ajustar</button>
                                                <button class="btn btn-secondary btn-sm" @click="openHistoryModal(item)">Histórico</button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div v-if="hasMore" class="load-more">
                            <button class="btn btn-secondary" :disabled="loadingMore" @click="loadMore">
                                {{ loadingMore ? 'Carregando...' : 'Ver mais' }}
                            </button>
                        </div>
                    </template>
                </div>
            </main>

            <!-- Modal: Registrar Compra -->
            <app-modal
                :visible="purchaseModal.visible"
                title="Registrar Compra"
                hide-actions
                @close="purchaseModal.visible = false"
            >
                <div class="form-row">
                    <div class="form-group">
                        <label>Data da compra (opcional)</label>
                        <input type="date" v-model="purchaseModal.form.purchased_at">
                    </div>
                    <div class="form-group">
                        <label>Observação (opcional)</label>
                        <input type="text" v-model="purchaseModal.form.notes" placeholder="Ex: Mercado Central">
                    </div>
                </div>

                <p class="section-title" style="margin-bottom:8px">Itens comprados</p>
                <span class="field-error">{{ purchaseModal.errors.items?.[0] ?? '' }}</span>

                <div class="purchase-row-header">
                    <span>Ingrediente</span>
                    <span></span>
                </div>
                <div class="purchase-fields-header">
                    <span>Tam. pacote</span>
                    <span>Nº pacotes</span>
                    <span>Total pago</span>
                </div>

                <div class="ingredient-rows">
                    <div v-for="(row, index) in purchaseModal.rows" :key="index" class="purchase-row">
                        <ingredient-autocomplete
                            :modelValue="row.ingredient_id"
                            :options="allIngredients"
                            @update:modelValue="onIngredientSelect(row, $event)"
                        />
                        <button type="button" class="btn btn-danger btn-sm" @click="removePurchaseRow(index)">×</button>
                        <div class="purchase-row-fields">
                            <div class="purchase-pkg-wrap">
                                <input type="tel" inputmode="decimal" v-model="row.package_size"
                                       placeholder="Peso do pacote" @keypress="onlyNumbers">
                                <span class="purchase-unit-label">{{ getIngredientUnit(row.ingredient_id) }}</span>
                            </div>
                            <input type="tel" inputmode="decimal" v-model="row.num_packages"
                                   placeholder="Nº pacotes" @keypress="onlyNumbers" class="purchase-num-pkgs">
                            <div class="purchase-price-wrap">
                                <span class="purchase-price-prefix">R$</span>
                                <input type="tel" inputmode="decimal" v-model="row.total_price"
                                       placeholder="Preço total" @keypress="onlyNumbers" class="purchase-price">
                            </div>
                            <div v-if="pricePerPackage(row) !== null" class="purchase-row-calc purchase-row-calc--inline">
                                R$ {{ fmtCurrency(pricePerPackage(row)) }}<br><span>/pacote</span>
                            </div>
                        </div>
                        <div v-if="pricePerPackage(row) !== null" class="purchase-row-calc purchase-row-calc--below">
                            = R$ {{ fmtCurrency(pricePerPackage(row)) }} / pacote
                        </div>
                    </div>
                </div>

                <button type="button" class="btn btn-secondary btn-sm mt-8" @click="addPurchaseRow">
                    + Adicionar Item
                </button>

                <div v-if="purchaseModal.rows.some(r => r.total_price)" class="purchase-subtotal">
                    Total: <strong>R$ {{ fmtCurrency(purchaseTotalValue()) }}</strong>
                </div>

                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" @click="purchaseModal.visible = false">Cancelar</button>
                    <button type="button" class="btn btn-primary" :disabled="purchaseModal.loading" @click="savePurchase">
                        {{ purchaseModal.loading ? 'Salvando...' : 'Registrar' }}
                    </button>
                </div>
            </app-modal>

            <!-- Modal: Ajustar Estoque -->
            <app-modal
                :visible="adjustModal.visible"
                :title="'Ajustar Estoque — ' + (adjustModal.ingredient?.name ?? '')"
                :loading="adjustModal.loading"
                submit-text="Salvar"
                @close="adjustModal.visible = false"
                @submit="saveAdjust"
            >
                <div class="form-group" :class="{ 'has-error': adjustModal.errors.stock_quantity }">
                    <label>Quantidade em estoque ({{ adjustModal.ingredient?.unit }})</label>
                    <input type="tel" inputmode="decimal" v-model="adjustModal.form.stock_quantity" @keypress="onlyNumbers">
                    <span class="field-error">{{ adjustModal.errors.stock_quantity?.[0] ?? '' }}</span>
                </div>
                <div class="form-group">
                    <label>Data do ajuste (opcional)</label>
                    <input type="date" v-model="adjustModal.form.movement_date">
                </div>
                <div class="form-group">
                    <label>Observação (opcional)</label>
                    <input type="text" v-model="adjustModal.form.notes" placeholder="Ex: Contagem física">
                </div>
            </app-modal>

            <!-- Modal: Histórico -->
            <app-modal
                :visible="historyModal.visible"
                :title="'Histórico — ' + (historyModal.ingredient?.name ?? '')"
                hide-actions
                @close="historyModal.visible = false"
            >
                <div v-if="historyModal.loading" class="loading">Carregando...</div>
                <p v-else-if="!historyModal.movements.length" class="empty-state">Nenhuma movimentação registrada.</p>
                <template v-else>
                    <div class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tipo</th>
                                    <th>Qtd</th>
                                    <th>Custo/un</th>
                                    <th>Data</th>
                                    <th>Ref.</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="m in historyModal.movements" :key="m.id">
                                    <td>{{ movementTypeLabel(m.type) }}</td>
                                    <td :class="parseFloat(m.quantity) >= 0 ? 'text-positive' : 'text-negative'">
                                        {{ parseFloat(m.quantity) >= 0 ? '+' : '' }}{{ fmtQuantity(m.quantity) }}
                                    </td>
                                    <td>R$ {{ fmtCurrency(m.unit_price) }}</td>
                                    <td>{{ movementDate(m) }}</td>
                                    <td>{{ m.recipe?.name ?? m.notes ?? '—' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <div v-if="historyModal.hasMore" class="load-more">
                        <button class="btn btn-secondary btn-sm" :disabled="historyModal.loadingMore" @click="loadMoreHistory">
                            {{ historyModal.loadingMore ? 'Carregando...' : 'Ver mais' }}
                        </button>
                    </div>
                </template>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" @click="historyModal.visible = false">Fechar</button>
                </div>
            </app-modal>
        </div>
    `,
};
