const RecipeDetailPage = {
    name: 'RecipeDetailPage',
    components: { AppHeader, AppModal, IngredientAutocomplete },
    mixins: [FormattersMixin, InputsMixin],
    data() {
        return {
            recipe: null,
            loading: true,
            loadError: false,
            editModal: {
                visible: false,
                loading: false,
                errors: {},
                form: { name: '', description: '', yield: '', yield_unit: '', invisible_cost_pct: 25, profit_multiplier: 3 },
            },
            addIngredientModal: {
                visible: false,
                loading: false,
                errors: {},
                available: [],
                form: { ingredient_id: '', quantity: '' },
            },
        };
    },
    computed: {
        editModalMargin() {
            const m = Number(this.editModal.form.profit_multiplier);
            if (!m || m <= 0) return '0,0';
            return ((1 - 1 / m) * 100).toFixed(1).replace('.', ',');
        },
    },
    async created() {
        await this.fetchRecipe();
    },
    methods: {
        async fetchRecipe() {
            this.loading = true;
            this.loadError = false;
            try {
                this.recipe = await RecipeService.getById(this.$route.params.id);
            } catch (_) {
                this.loadError = true;
            } finally {
                this.loading = false;
            }
        },

        // Constrói o array de ingredientes no formato aceito pela API,
        // partindo da lista atual da receita com alterações opcionais.
        buildIngredientsPayload({ add = null, removeId = null } = {}) {
            const base = this.recipe.ingredients
                .filter(i => i.id !== removeId)
                .map(i => ({ ingredient_id: i.id, quantity: parseFloat(i.quantity) }));

            return add ? [...base, add] : base;
        },

        openEditModal() {
            this.editModal.form = {
                name:               this.recipe.name,
                description:        this.recipe.description ?? '',
                yield:              this.recipe.yield,
                yield_unit:         this.recipe.yield_unit,
                invisible_cost_pct: Number(this.recipe.invisible_cost_pct),
                profit_multiplier:  Number(this.recipe.profit_multiplier),
            };
            this.editModal.errors = {};
            this.editModal.visible = true;
        },

        async saveRecipe() {
            this.editModal.loading = true;
            this.editModal.errors = {};
            try {
                this.recipe = await RecipeService.update(this.recipe.id, {
                    name:               this.editModal.form.name.trim(),
                    description:        this.editModal.form.description.trim() || null,
                    yield:              this.parseDecimal(this.editModal.form.yield),
                    yield_unit:         this.editModal.form.yield_unit.trim(),
                    invisible_cost_pct: this.parseDecimal(this.editModal.form.invisible_cost_pct),
                    profit_multiplier:  this.parseDecimal(this.editModal.form.profit_multiplier),
                });
                store.success('Receita atualizada com sucesso.');
                this.editModal.visible = false;
            } catch (err) {
                this.editModal.errors = err.errors || {};
                if (!err.errors) store.error(err.message || 'Erro ao salvar receita.');
            } finally {
                this.editModal.loading = false;
            }
        },

        async openAddIngredientModal() {
            let allIngredients;
            try {
                allIngredients = await IngredientService.getAll();
            } catch (_) {
                store.error('Erro ao carregar ingredientes.');
                return;
            }

            const currentIds = new Set(this.recipe.ingredients.map(i => i.id));
            this.addIngredientModal.available = allIngredients.filter(i => !currentIds.has(i.id));

            if (!this.addIngredientModal.available.length) {
                store.error('Todos os ingredientes já foram adicionados a esta receita.');
                return;
            }

            this.addIngredientModal.form = { ingredient_id: '', quantity: '' };
            this.addIngredientModal.errors = {};
            this.addIngredientModal.visible = true;
        },

        async addIngredient() {
            this.addIngredientModal.errors = {};

            if (!this.addIngredientModal.form.ingredient_id) {
                this.addIngredientModal.errors = { ingredient_id: ['Selecione um ingrediente.'] };
                return;
            }
            if (!this.addIngredientModal.form.quantity || parseFloat(this.addIngredientModal.form.quantity) <= 0) {
                this.addIngredientModal.errors = { quantity: ['A quantidade deve ser maior que zero.'] };
                return;
            }

            this.addIngredientModal.loading = true;
            try {
                const newItem = {
                    ingredient_id: this.addIngredientModal.form.ingredient_id,
                    quantity: this.parseDecimal(this.addIngredientModal.form.quantity),
                };
                this.recipe = await RecipeService.update(this.recipe.id, {
                    ingredients: this.buildIngredientsPayload({ add: newItem }),
                });
                store.success('Ingrediente adicionado.');
                this.addIngredientModal.visible = false;
            } catch (err) {
                if (!err.errors) store.error(err.message || 'Erro ao adicionar ingrediente.');
            } finally {
                this.addIngredientModal.loading = false;
            }
        },

        async removeIngredient(ingredient) {
            if (!confirm(`Remover "${ingredient.name}" desta receita?`)) return;
            try {
                this.recipe = await RecipeService.update(this.recipe.id, {
                    ingredients: this.buildIngredientsPayload({ removeId: ingredient.id }),
                });
                store.success('Ingrediente removido.');
            } catch (err) {
                store.error(err.message || 'Erro ao remover ingrediente.');
            }
        },
    },
    template: `
        <div class="app-layout">
            <app-header />
            <main class="app-main">
                <div class="container">
                    <a href="/recipes" class="back-link">← Voltar para Receitas</a>

                    <div v-if="loading" class="loading">Carregando...</div>
                    <div v-else-if="loadError" class="error-state">Receita não encontrada.</div>
                    <template v-else-if="recipe">
                        <div class="recipe-detail-header">
                            <div>
                                <h1 class="recipe-detail-title">{{ recipe.name }}</h1>
                                <p v-if="recipe.description" class="recipe-detail-desc">{{ recipe.description }}</p>
                                <p class="recipe-meta">Rendimento: {{ fmtCurrency(recipe.yield) }} {{ recipe.yield_unit }}</p>
                            </div>
                            <button class="btn btn-secondary" @click="openEditModal">Editar</button>
                        </div>

                        <div class="cost-summary">
                            <div class="cost-item">
                                <label>Ingredientes</label>
                                <strong>R$ {{ fmtCurrency(recipe.ingredients_cost) }}</strong>
                            </div>
                            <div v-if="recipe.packaging_cost > 0" class="cost-item">
                                <label>Embalagem</label>
                                <strong>R$ {{ fmtCurrency(recipe.packaging_cost) }}</strong>
                            </div>
                            <div v-if="recipe.invisible_cost_pct > 0" class="cost-item">
                                <label>Custos Invisíveis ({{ recipe.invisible_cost_pct }}%)</label>
                                <strong>R$ {{ fmtCurrency(recipe.invisible_cost) }}</strong>
                            </div>
                            <div class="cost-item">
                                <label>Custo de Produção</label>
                                <strong>R$ {{ fmtCurrency(recipe.production_cost) }}</strong>
                            </div>
                            <div v-if="recipe.profit_multiplier > 1" class="cost-item cost-item-highlight">
                                <label>Preço Sugerido / {{ recipe.yield_unit }} ({{ recipe.profit_multiplier }}x · margem {{ recipe.profit_margin_pct }}%)</label>
                                <strong>R$ {{ fmtCurrency(recipe.suggested_price_per_yield) }}</strong>
                            </div>
                            <div v-else class="cost-item">
                                <label>Por {{ recipe.yield_unit }}</label>
                                <strong>R$ {{ fmtCurrency(recipe.cost_per_yield) }}</strong>
                            </div>
                        </div>

                        <div class="page-header">
                            <p class="section-title" style="margin-bottom:0">Ingredientes</p>
                            <button class="btn btn-primary btn-sm" @click="openAddIngredientModal">+ Adicionar</button>
                        </div>

                        <div class="table-wrapper">
                            <p v-if="!recipe.ingredients.length" class="empty-state">Nenhum ingrediente nesta receita.</p>
                            <table v-else>
                                <thead>
                                    <tr>
                                        <th>Ingrediente</th>
                                        <th>Unidade</th>
                                        <th>Quantidade</th>
                                        <th>Preço Unit.</th>
                                        <th>Subtotal</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="i in recipe.ingredients" :key="i.id">
                                        <td>{{ i.name }}</td>
                                        <td>{{ i.unit }}</td>
                                        <td>{{ fmtQuantity(i.quantity) }}</td>
                                        <td>R$ {{ fmtCurrency(i.last_price) }}</td>
                                        <td>R$ {{ fmtCurrency(i.subtotal) }}</td>
                                        <td>
                                            <div class="td-actions">
                                                <button class="btn btn-danger btn-sm" @click="removeIngredient(i)">Remover</button>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </template>
                </div>
            </main>

            <app-modal
                :visible="editModal.visible"
                title="Editar Receita"
                :loading="editModal.loading"
                @close="editModal.visible = false"
                @submit="saveRecipe"
            >
                <div class="form-group" :class="{ 'has-error': editModal.errors.name }">
                    <label>Nome</label>
                    <input type="text" v-model="editModal.form.name">
                    <span class="field-error">{{ editModal.errors.name?.[0] ?? '' }}</span>
                </div>
                <div class="form-group">
                    <label>Descrição (opcional)</label>
                    <textarea v-model="editModal.form.description" rows="3"></textarea>
                </div>
                <div class="form-group" :class="{ 'has-error': editModal.errors.yield }">
                    <label>Rendimento</label>
                    <input type="tel" inputmode="decimal" v-model="editModal.form.yield" @keypress="onlyNumbers">
                    <span class="field-error">{{ editModal.errors.yield?.[0] ?? '' }}</span>
                </div>
                <div class="form-group" :class="{ 'has-error': editModal.errors.yield_unit }">
                    <label>Unidade</label>
                    <input type="text" v-model="editModal.form.yield_unit">
                    <span class="field-error">{{ editModal.errors.yield_unit?.[0] ?? '' }}</span>
                </div>
                <div class="form-group" :class="{ 'has-error': editModal.errors.invisible_cost_pct }">
                    <label>Custos Invisíveis (%)</label>
                    <input type="tel" inputmode="decimal" v-model="editModal.form.invisible_cost_pct" placeholder="25" @keypress="onlyNumbers">
                    <span class="field-error">{{ editModal.errors.invisible_cost_pct?.[0] ?? '' }}</span>
                </div>
                <div class="form-group" :class="{ 'has-error': editModal.errors.profit_multiplier }">
                    <label>Multiplicador de Lucro</label>
                    <div class="multiplier-control">
                        <input type="range" min="1" max="6" step="0.25" v-model.number="editModal.form.profit_multiplier">
                        <input type="tel" inputmode="decimal" v-model.number="editModal.form.profit_multiplier" class="multiplier-input" @keypress="onlyNumbers">
                        <span class="multiplier-suffix">x</span>
                    </div>
                    <p class="multiplier-hint">Margem de lucro: {{ editModalMargin }}%</p>
                    <span class="field-error">{{ editModal.errors.profit_multiplier?.[0] ?? '' }}</span>
                </div>
            </app-modal>

            <app-modal
                :visible="addIngredientModal.visible"
                title="Adicionar Ingrediente"
                :loading="addIngredientModal.loading"
                @close="addIngredientModal.visible = false"
                @submit="addIngredient"
            >
                <div class="form-group" :class="{ 'has-error': addIngredientModal.errors.ingredient_id }">
                    <label>Ingrediente</label>
                    <ingredient-autocomplete v-model="addIngredientModal.form.ingredient_id" :options="addIngredientModal.available" />
                    <span class="field-error">{{ addIngredientModal.errors.ingredient_id?.[0] ?? '' }}</span>
                </div>
                <div class="form-group" :class="{ 'has-error': addIngredientModal.errors.quantity }">
                    <label>Quantidade</label>
                    <input type="tel" inputmode="decimal" v-model="addIngredientModal.form.quantity" placeholder="0.000" @keypress="onlyNumbers">
                    <span class="field-error">{{ addIngredientModal.errors.quantity?.[0] ?? '' }}</span>
                </div>
            </app-modal>
        </div>
    `,
};
