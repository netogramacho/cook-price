const DashboardPage = {
    name: 'DashboardPage',
    components: { AppHeader },
    mixins: [FormattersMixin],
    data() {
        return {
            stats: null,
            loading: true,
            loadError: false,
        };
    },
    async created() {
        try {
            this.stats = await DashboardService.get();
        } catch (_) {
            this.loadError = true;
        } finally {
            this.loading = false;
        }
    },
    methods: {
        fmtStock(item) {
            return this.fmtQuantity(item.stock_quantity) + item.unit
                + ' / mín ' + this.fmtQuantity(item.min_stock) + item.unit;
        },
    },
    template: `
        <div class="app-layout">
            <app-header active-page="dashboard" />
            <main class="app-main">
                <div class="container">

                    <div v-if="loading" class="loading">Carregando...</div>
                    <div v-else-if="loadError" class="error-state">Erro ao carregar dashboard.</div>

                    <template v-else-if="stats">
                        <div class="dashboard-stats">
                            <a href="/ingredients" class="stat-card stat-card-link">
                                <p class="stat-card-label">Ingredientes</p>
                                <p class="stat-card-value">{{ stats.ingredients_count }}</p>
                                <p class="stat-card-hint" v-if="stats.ingredients_count === 0">Cadastre seu primeiro ingrediente →</p>
                            </a>
                            <a href="/recipes" class="stat-card stat-card-link">
                                <p class="stat-card-label">Receitas</p>
                                <p class="stat-card-value">{{ stats.recipes_count }}</p>
                                <p class="stat-card-hint" v-if="stats.recipes_count === 0">Crie sua primeira receita →</p>
                            </a>
                        </div>

                        <div class="critical-stock-section">
                            <p class="critical-stock-title">⚠ Estoque crítico</p>
                            <div v-if="stats.critical_stock.length" class="critical-stock-list">
                                <div v-for="item in stats.critical_stock" :key="item.id" class="critical-stock-item">
                                    <span class="critical-stock-name">{{ item.name }}</span>
                                    <span class="critical-stock-qty">{{ fmtStock(item) }}</span>
                                </div>
                            </div>
                            <div v-else>
                                <p class="critical-stock-empty">Nenhum ingrediente com estoque abaixo do mínimo.</p>
                                <p class="critical-stock-hint">Configure o estoque mínimo de cada ingrediente em <a href="/stock">Estoque → Ajustar</a>.</p>
                            </div>
                        </div>
                    </template>

                </div>
            </main>
        </div>
    `,
};
