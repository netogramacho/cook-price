const RecipesPage = {
    name: 'RecipesPage',
    components: { AppHeader, AppModal, IngredientAutocomplete },
    mixins: [FormattersMixin, InputsMixin],
    data() {
        return {
            recipes: [],
            currentPage: 1,
            hasMore: false,
            loading: true,
            loadingMore: false,
            loadError: false,
            search: '',
            debounceTimer: null,
            availableIngredients: [],
            availablePackaging: [],
            modal: {
                visible: false,
                step: 'recipe-data',
                loading: false,
                errors: {},
                form: { name: '', description: '', yield: '', yield_unit: '', invisible_cost_pct: 25, profit_multiplier: 3 },
                ingredientRows: [{ ingredient_id: '', quantity: '' }],
                packagingRows: [],
            },
        };
    },
    computed: {
        modalMargin() {
            const m = Number(this.modal.form.profit_multiplier);
            if (!m || m <= 0) return '0,0';
            return ((1 - 1 / m) * 100).toFixed(1).replace('.', ',');
        },
    },
    async created() {
        await this.fetchRecipes();
    },
    watch: {
        search() {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => this.fetchRecipes(), 300);
        },
    },
    methods: {
        async fetchRecipes() {
            this.loading = true;
            this.loadError = false;
            this.recipes = [];
            this.currentPage = 1;
            try {
                const { items, meta } = await RecipeService.getPaginated(1, this.search.trim());
                this.recipes     = items;
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
                const { items, meta } = await RecipeService.getPaginated(this.currentPage + 1, this.search.trim());
                this.recipes.push(...items);
                this.currentPage = meta.current_page;
                this.hasMore     = meta.current_page < meta.last_page;
            } catch (_) {
                store.error('Erro ao carregar mais receitas.');
            } finally {
                this.loadingMore = false;
            }
        },

        async openCreateModal() {
            let userDefaults = { invisible_cost_pct: 0, profit_margin_pct: 0 };
            try {
                const [allIngredients, user] = await Promise.all([
                    IngredientService.getAll(),
                    UserService.get(),
                ]);
                this.availableIngredients = allIngredients.filter(i => i.type === 'ingredient');
                this.availablePackaging   = allIngredients.filter(i => i.type === 'packaging');
                userDefaults = user;
            } catch (_) {
                store.error('Erro ao carregar dados.');
                return;
            }

            this.modal.step = 'recipe-data';
            this.modal.form = {
                name: '', description: '', yield: '', yield_unit: '',
                invisible_cost_pct: Number(userDefaults.invisible_cost_pct),
                profit_multiplier:  Number(userDefaults.profit_multiplier),
            };
            this.modal.ingredientRows = [{ ingredient_id: '', quantity: '' }];
            this.modal.packagingRows  = [];
            this.modal.errors = {};
            this.modal.visible = true;
        },

        nextStep() {
            if (this.modal.step === 'recipe-data') {
                const errors = {};
                if (!this.modal.form.name.trim())      errors.name       = ['O nome é obrigatório.'];
                if (!this.modal.form.yield)             errors.yield      = ['O rendimento é obrigatório.'];
                if (!this.modal.form.yield_unit.trim()) errors.yield_unit = ['A unidade é obrigatória.'];
                if (Object.keys(errors).length) { this.modal.errors = errors; return; }
                this.modal.errors = {};
                this.modal.step = 'ingredients';
            } else if (this.modal.step === 'ingredients') {
                this.modal.step = 'packaging';
            }
        },

        prevStep() {
            if (this.modal.step === 'packaging')   this.modal.step = 'ingredients';
            else if (this.modal.step === 'ingredients') this.modal.step = 'recipe-data';
        },

        addIngredientRow() {
            this.modal.ingredientRows.push({ ingredient_id: '', quantity: '' });
        },

        removeIngredientRow(index) {
            this.modal.ingredientRows.splice(index, 1);
        },

        addPackagingRow() {
            this.modal.packagingRows.push({ ingredient_id: '', quantity: '' });
        },

        removePackagingRow(index) {
            this.modal.packagingRows.splice(index, 1);
        },

        buildIngredientsPayload() {
            const ingredients = this.modal.ingredientRows
                .filter(row => row.ingredient_id && row.quantity)
                .map(row => ({ ingredient_id: row.ingredient_id, quantity: this.parseDecimal(row.quantity) }));

            const packaging = this.modal.packagingRows
                .filter(row => row.ingredient_id && row.quantity)
                .map(row => ({ ingredient_id: row.ingredient_id, quantity: this.parseDecimal(row.quantity) }));

            return [...ingredients, ...packaging];
        },

        async saveRecipe() {
            this.modal.loading = true;
            this.modal.errors = {};
            try {
                await RecipeService.create({
                    name:                this.modal.form.name.trim(),
                    description:         this.modal.form.description.trim() || null,
                    yield:               this.parseDecimal(this.modal.form.yield),
                    yield_unit:          this.modal.form.yield_unit.trim(),
                    invisible_cost_pct:  this.parseDecimal(this.modal.form.invisible_cost_pct),
                    profit_multiplier:   this.parseDecimal(this.modal.form.profit_multiplier),
                    ingredients:         this.buildIngredientsPayload(),
                });
                store.success('Receita criada com sucesso.');
                this.modal.visible = false;
                await this.fetchRecipes();
            } catch (err) {
                this.modal.errors = err.errors || {};
                if (!err.errors) store.error(err.message || 'Erro ao salvar receita.');
            } finally {
                this.modal.loading = false;
            }
        },

        async deleteRecipe(recipe) {
            if (!confirm(`Excluir a receita "${recipe.name}"? Esta ação não pode ser desfeita.`)) return;
            try {
                await RecipeService.delete(recipe.id);
                store.success('Receita excluída.');
                await this.fetchRecipes();
            } catch (err) {
                store.error(err.message || 'Erro ao excluir receita.');
            }
        },
    },
    template: `
        <div class="app-layout">
            <app-header active-page="recipes" />
            <main class="app-main">
                <div class="container">
                    <div class="page-header">
                        <h1>Receitas</h1>
                        <button class="btn btn-primary" @click="openCreateModal">+ Nova Receita</button>
                    </div>

                    <div class="search-bar">
                        <input type="text" v-model="search" placeholder="Buscar receita..." class="search-input">
                    </div>

                    <div v-if="loading" class="loading">Carregando...</div>
                    <div v-else-if="loadError" class="error-state">Erro ao carregar receitas.</div>
                    <p v-else-if="!recipes.length" class="empty-state">
                        {{ search ? 'Nenhuma receita encontrada para "' + search + '".' : 'Nenhuma receita cadastrada ainda.' }}
                    </p>
                    <template v-else>
                        <div v-for="r in recipes" :key="r.id" class="recipe-card">
                            <div class="recipe-info">
                                <strong>{{ r.name }}</strong>
                                <span>
                                    Custo total: R$ {{ fmtCurrency(r.total_cost) }}
                                    &nbsp;·&nbsp;
                                    Por {{ r.yield_unit }}: R$ {{ fmtCurrency(r.cost_per_yield) }}
                                    &nbsp;·&nbsp;
                                    Preço sugerido/{{ r.yield_unit }}: R$ {{ fmtCurrency(r.suggested_price_per_yield) }}
                                </span>
                            </div>
                            <div class="recipe-actions">
                                <a :href="'/recipes/' + r.id" class="btn btn-secondary btn-sm">Ver</a>
                                <button class="btn btn-danger btn-sm" @click="deleteRecipe(r)">Excluir</button>
                            </div>
                        </div>

                        <div v-if="hasMore" class="load-more">
                            <button class="btn btn-secondary" :disabled="loadingMore" @click="loadMore">
                                {{ loadingMore ? 'Carregando...' : 'Ver mais' }}
                            </button>
                        </div>
                    </template>
                </div>
            </main>

            <app-modal
                :visible="modal.visible"
                :title="modal.step === 'recipe-data' ? 'Nova Receita — Dados' : modal.step === 'ingredients' ? 'Nova Receita — Ingredientes' : 'Nova Receita — Embalagens'"
                hide-actions
                @close="modal.visible = false"
            >
                <!-- Etapa 1: Dados da receita -->
                <template v-if="modal.step === 'recipe-data'">
                    <div class="form-group" :class="{ 'has-error': modal.errors.name }">
                        <label>Nome da Receita</label>
                        <input type="text" v-model="modal.form.name" placeholder="Ex: Bolo de chocolate">
                        <span class="field-error">{{ modal.errors.name?.[0] ?? '' }}</span>
                    </div>
                    <div class="form-group">
                        <label>Descrição (opcional)</label>
                        <textarea v-model="modal.form.description" rows="2" placeholder="Descreva a receita..."></textarea>
                    </div>
                    <div class="form-row">
                        <div class="form-group" :class="{ 'has-error': modal.errors.yield }">
                            <label>Rendimento</label>
                            <input type="tel" inputmode="decimal" v-model="modal.form.yield" placeholder="10" @keypress="onlyNumbers">
                            <span class="field-error">{{ modal.errors.yield?.[0] ?? '' }}</span>
                        </div>
                        <div class="form-group" :class="{ 'has-error': modal.errors.yield_unit }">
                            <label>Unidade</label>
                            <input type="text" v-model="modal.form.yield_unit" placeholder="porções">
                            <span class="field-error">{{ modal.errors.yield_unit?.[0] ?? '' }}</span>
                        </div>
                    </div>
                    <div class="form-group" :class="{ 'has-error': modal.errors.invisible_cost_pct }">
                        <label>Custos Invisíveis (%)</label>
                        <input type="tel" inputmode="decimal" v-model="modal.form.invisible_cost_pct" placeholder="25" @keypress="onlyNumbers">
                        <span class="field-error">{{ modal.errors.invisible_cost_pct?.[0] ?? '' }}</span>
                    </div>
                    <div class="form-group" :class="{ 'has-error': modal.errors.profit_multiplier }">
                        <label>Multiplicador de Lucro</label>
                        <div class="multiplier-control">
                            <input type="range" min="1" max="6" step="0.25" v-model.number="modal.form.profit_multiplier">
                            <input type="tel" inputmode="decimal" v-model.number="modal.form.profit_multiplier" class="multiplier-input" @keypress="onlyNumbers">
                            <span class="multiplier-suffix">x</span>
                        </div>
                        <p class="multiplier-hint">Margem de lucro: {{ modalMargin }}%</p>
                        <span class="field-error">{{ modal.errors.profit_multiplier?.[0] ?? '' }}</span>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" @click="modal.visible = false">Cancelar</button>
                        <button type="button" class="btn btn-primary" @click="nextStep">Próximo →</button>
                    </div>
                </template>

                <!-- Etapa 2: Ingredientes -->
                <template v-else-if="modal.step === 'ingredients'">
                    <p class="step-hint">Adicione os ingredientes utilizados na receita. Embalagens serão adicionadas na próxima etapa.</p>
                    <span class="field-error">{{ modal.errors.ingredients?.[0] ?? '' }}</span>
                    <div class="ingredient-rows">
                        <div v-for="(row, index) in modal.ingredientRows" :key="index" class="ingredient-row">
                            <ingredient-autocomplete v-model="row.ingredient_id" :options="availableIngredients" />
                            <input type="tel" inputmode="decimal" v-model="row.quantity" placeholder="Qtd" @keypress="onlyNumbers">
                            <button type="button" class="btn btn-danger btn-sm" @click="removeIngredientRow(index)">×</button>
                        </div>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm mt-8" @click="addIngredientRow">
                        + Adicionar Ingrediente
                    </button>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" @click="prevStep">← Voltar</button>
                        <button type="button" class="btn btn-primary" @click="nextStep">Próximo →</button>
                    </div>
                </template>

                <!-- Etapa 3: Embalagens -->
                <template v-else-if="modal.step === 'packaging'">
                    <p class="step-hint">Adicione as embalagens utilizadas na receita (opcional).</p>
                    <div class="ingredient-rows">
                        <div v-for="(row, index) in modal.packagingRows" :key="index" class="ingredient-row">
                            <ingredient-autocomplete v-model="row.ingredient_id" :options="availablePackaging" />
                            <input type="tel" inputmode="decimal" v-model="row.quantity" placeholder="Qtd" @keypress="onlyNumbers">
                            <button type="button" class="btn btn-danger btn-sm" @click="removePackagingRow(index)">×</button>
                        </div>
                    </div>
                    <button type="button" class="btn btn-secondary btn-sm mt-8" @click="addPackagingRow">
                        + Adicionar Embalagem
                    </button>
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" @click="prevStep">← Voltar</button>
                        <button type="button" class="btn btn-primary" :disabled="modal.loading" @click="saveRecipe">
                            {{ modal.loading ? 'Salvando...' : 'Salvar' }}
                        </button>
                    </div>
                </template>
            </app-modal>
        </div>
    `,
};
