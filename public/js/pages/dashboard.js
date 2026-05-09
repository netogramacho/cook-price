const DashboardPage = {
    name: 'DashboardPage',
    components: { AppHeader },
    data() {
        return {
            features: [
                { href: '/ingredients', icon: '🥕', title: 'Ingredientes',  description: 'Cadastre e gerencie ingredientes com preços atualizados' },
                { href: '/recipes',     icon: '📖', title: 'Receitas',      description: 'Crie receitas e calcule o custo de produção automaticamente' },
                { href: '/stock',       icon: '📦', title: 'Estoque',       description: 'Controle o estoque de ingredientes e registre movimentações' },
            ],
        };
    },
    template: `
        <div class="app-layout">
            <app-header />
            <main class="app-main">
                <div class="container">
                    <p class="section-title">Funcionalidades</p>
                    <div class="dashboard-features">
                        <a v-for="f in features" :key="f.href" :href="f.href" class="feature-card">
                            <span class="feature-icon">{{ f.icon }}</span>
                            <strong class="feature-title">{{ f.title }}</strong>
                            <span class="feature-description">{{ f.description }}</span>
                        </a>
                    </div>
                </div>
            </main>
        </div>
    `,
};
