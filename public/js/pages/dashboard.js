const DashboardPage = {
    name: 'DashboardPage',
    components: { AppHeader },
    mixins: [FormattersMixin],
    data() {
        return {
            recipes: [],
            loading: true,
            loadError: false,
        };
    },
    async created() {
        await this.fetchRecipes();
    },
    methods: {
        async fetchRecipes() {
            this.loading = true;
            this.loadError = false;
            try {
                this.recipes = await RecipeService.getAll();
            } catch (_) {
                this.loadError = true;
            } finally {
                this.loading = false;
            }
        },
    },
    template: `
        <div class="app-layout">
            <app-header />
            <main class="app-main">
                <div class="container">
                    <div class="dashboard-shortcuts">
                        <a href="/ingredients" class="shortcut-card">
                            <span class="shortcut-icon">🥕</span>
                            <strong>Ingredientes</strong>
                        </a>
                        <a href="/recipes" class="shortcut-card">
                            <span class="shortcut-icon">📖</span>
                            <strong>Receitas</strong>
                        </a>
                    </div>

                    <p class="section-title">Suas Receitas</p>

                    <div v-if="loading" class="loading">Carregando...</div>
                    <div v-else-if="loadError" class="error-state">Erro ao carregar receitas.</div>
                    <p v-else-if="!recipes.length" class="empty-state">
                        Nenhuma receita ainda. <a href="/recipes">Criar sua primeira receita</a>
                    </p>
                    <template v-else>
                        <div v-for="r in recipes" :key="r.id" class="recipe-card">
                            <div class="recipe-info">
                                <strong>{{ r.name }}</strong>
                                <span>
                                    Custo total: R$ {{ fmtCurrency(r.total_cost) }}
                                    &nbsp;·&nbsp;
                                    Por {{ r.yield_unit }}: R$ {{ fmtCurrency(r.cost_per_yield) }}
                                </span>
                            </div>
                            <div class="recipe-actions">
                                <a :href="'/recipes/' + r.id" class="btn btn-secondary btn-sm">Ver</a>
                            </div>
                        </div>
                    </template>
                </div>
            </main>
        </div>
    `,
};
