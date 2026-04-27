const IngredientsPage = {
    name: 'IngredientsPage',
    components: { AppHeader, AppModal },
    mixins: [FormattersMixin, InputsMixin],
    data() {
        return {
            ingredients: [],
            search: '',
            loading: true,
            loadError: false,
            modal: {
                visible: false,
                step: 'type-select',
                editing: null,
                loading: false,
                errors: {},
                form: { name: '', type: '', unit: '', package_size: '', last_price: '' },
            },
        };
    },
    async created() {
        await this.fetchIngredients();
    },
    computed: {
        filteredIngredients() {
            const q = this.search.trim().toLowerCase();
            if (!q) return this.ingredients;
            return this.ingredients.filter(i => i.name.toLowerCase().includes(q));
        },
    },
    methods: {
        async fetchIngredients() {
            this.loading = true;
            this.loadError = false;
            try {
                this.ingredients = await IngredientService.getAll();
            } catch (_) {
                this.loadError = true;
            } finally {
                this.loading = false;
            }
        },

        openCreateModal() {
            this.modal.editing = null;
            this.modal.step = 'type-select';
            this.modal.errors = {};
            this.modal.form = { name: '', type: '', unit: '', package_size: '', last_price: '' };
            this.modal.visible = true;
        },

        openEditModal(ingredient) {
            this.modal.editing = ingredient;
            this.modal.step = 'form';
            this.modal.errors = {};
            this.modal.form = {
                name:         ingredient.name,
                type:         ingredient.type,
                unit:         ingredient.unit,
                package_size: Number(ingredient.package_size),
                last_price:   this.fmtCurrency(ingredient.last_price),
            };
            this.modal.visible = true;
        },

        selectType(type) {
            this.modal.form.type = type;
            this.modal.step = 'form';
        },

        async saveIngredient() {
            this.modal.loading = true;
            this.modal.errors = {};
            try {
                const isEditing = !!this.modal.editing;
                const payload = {
                    ...this.modal.form,
                    package_size: this.parseDecimal(this.modal.form.package_size),
                    last_price:   this.parseDecimal(this.modal.form.last_price),
                };
                if (isEditing) {
                    await IngredientService.update(this.modal.editing.id, payload);
                    store.success('Ingrediente atualizado com sucesso.');
                } else {
                    await IngredientService.create(payload);
                    store.success('Ingrediente criado com sucesso.');
                }
                this.modal.visible = false;
                await this.fetchIngredients();
            } catch (err) {
                this.modal.errors = err.errors || {};
                if (!err.errors) store.error(err.message || 'Erro ao salvar ingrediente.');
            } finally {
                this.modal.loading = false;
            }
        },

        async deleteIngredient(ingredient) {
            if (!confirm(`Excluir "${ingredient.name}"? Esta ação não pode ser desfeita.`)) return;
            try {
                await IngredientService.delete(ingredient.id);
                store.success('Ingrediente excluído.');
                await this.fetchIngredients();
            } catch (err) {
                store.error(err.message || 'Erro ao excluir ingrediente.');
            }
        },

        typeBadgeClass(type) {
            return type === 'packaging' ? 'badge badge-packaging' : 'badge badge-ingredient';
        },

        typeBadgeLabel(type) {
            return type === 'packaging' ? 'Embalagem' : 'Ingrediente';
        },
    },
    template: `
        <div class="app-layout">
            <app-header active-page="ingredients" />
            <main class="app-main">
                <div class="container">
                    <div class="page-header">
                        <h1>Ingredientes</h1>
                        <button class="btn btn-primary" @click="openCreateModal">+ Novo Ingrediente</button>
                    </div>

                    <div v-if="!loading && !loadError" class="search-bar">
                        <input type="text" v-model="search" placeholder="Buscar ingrediente..." class="search-input">
                    </div>

                    <div v-if="loading" class="loading">Carregando...</div>
                    <div v-else-if="loadError" class="error-state">Erro ao carregar ingredientes.</div>
                    <p v-else-if="!ingredients.length" class="empty-state">Nenhum ingrediente cadastrado ainda.</p>
                    <p v-else-if="!filteredIngredients.length" class="empty-state">Nenhum ingrediente encontrado para "{{ search }}".</p>
                    <div v-else class="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Tipo</th>
                                    <th>Unidade</th>
                                    <th>Tamanho do Pacote</th>
                                    <th>Preço do Pacote</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="i in filteredIngredients" :key="i.id">
                                    <td>{{ i.name }}</td>
                                    <td><span :class="typeBadgeClass(i.type)">{{ typeBadgeLabel(i.type) }}</span></td>
                                    <td>{{ i.unit }}</td>
                                    <td>{{ fmtQuantity(i.package_size) }} {{ i.unit }}</td>
                                    <td>R$ {{ fmtCurrency(i.last_price) }}</td>
                                    <td>
                                        <div class="td-actions">
                                            <button class="btn btn-secondary btn-sm" @click="openEditModal(i)">Editar</button>
                                            <button class="btn btn-danger btn-sm" @click="deleteIngredient(i)">Excluir</button>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <app-modal
                :visible="modal.visible"
                :title="modal.editing ? 'Editar Ingrediente' : 'Novo Ingrediente'"
                :loading="modal.loading"
                :hide-actions="modal.step === 'type-select'"
                @close="modal.visible = false"
                @submit="saveIngredient"
            >
                <!-- Step 1: seleção de tipo -->
                <div v-if="modal.step === 'type-select'" class="type-select">
                    <p class="type-select-label">O que você está cadastrando?</p>
                    <div class="type-select-cards">
                        <button type="button" class="type-card" @click="selectType('ingredient')">
                            <span class="type-card-icon">🥕</span>
                            <strong>Ingrediente</strong>
                            <span>Farinha, manteiga, ovos...</span>
                        </button>
                        <button type="button" class="type-card" @click="selectType('packaging')">
                            <span class="type-card-icon">📦</span>
                            <strong>Embalagem</strong>
                            <span>Caixa, saco, etiqueta...</span>
                        </button>
                    </div>
                </div>

                <!-- Step 2: formulário de detalhes -->
                <template v-if="modal.step === 'form'">
                    <button v-if="!modal.editing" type="button" class="btn-back" @click="modal.step = 'type-select'">
                        ← Voltar
                    </button>
                    <div class="form-group" :class="{ 'has-error': modal.errors.name }">
                        <label>Nome</label>
                        <input type="text" v-model="modal.form.name" placeholder="Ex: Farinha de trigo">
                        <span class="field-error">{{ modal.errors.name?.[0] ?? '' }}</span>
                    </div>
                    <div class="form-group" :class="{ 'has-error': modal.errors.unit }">
                        <label>Unidade</label>
                        <select v-model="modal.form.unit">
                            <option value="" disabled>Selecionar unidade...</option>
                            <option value="g">g — Grama</option>
                            <option value="ml">ml — Mililitro</option>
                            <option value="un">un — Unidade</option>
                        </select>
                        <span class="field-error">{{ modal.errors.unit?.[0] ?? '' }}</span>
                    </div>
                    <div class="form-group" :class="{ 'has-error': modal.errors.package_size }">
                        <label>Tamanho do Pacote</label>
                        <input type="tel" inputmode="decimal" v-model="modal.form.package_size" placeholder="Ex: 500" @keypress="onlyNumbers">
                        <span class="field-error">{{ modal.errors.package_size?.[0] ?? '' }}</span>
                    </div>
                    <div class="form-group" :class="{ 'has-error': modal.errors.last_price }">
                        <label>Preço do Pacote (R$)</label>
                        <input type="tel" inputmode="decimal" v-model="modal.form.last_price" placeholder="0.00" @keypress="onlyNumbers">
                        <span class="field-error">{{ modal.errors.last_price?.[0] ?? '' }}</span>
                    </div>
                </template>
            </app-modal>
        </div>
    `,
};
