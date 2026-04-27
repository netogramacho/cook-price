const AppHeader = {
    name: 'AppHeader',
    components: { AppModal },
    mixins: [InputsMixin],
    props: {
        activePage: { type: String, default: '' },
    },
    data() {
        return {
            settingsModal: {
                visible: false,
                loading: false,
                errors: {},
                form: { invisible_cost_pct: '', profit_multiplier: 3 },
            },
        };
    },
    computed: {
        userName() {
            return Auth.getUser()?.name ?? '';
        },
        settingsMargin() {
            const m = Number(this.settingsModal.form.profit_multiplier);
            if (!m || m <= 0) return '0,0';
            return ((1 - 1 / m) * 100).toFixed(1).replace('.', ',');
        },
    },
    methods: {
        async logout() {
            await AuthService.logout();
        },

        async openSettings() {
            try {
                const user = await UserService.get();
                this.settingsModal.form = {
                    invisible_cost_pct: Number(user.invisible_cost_pct),
                    profit_multiplier:  Number(user.profit_multiplier),
                };
            } catch (_) {
                store.error('Erro ao carregar configurações.');
                return;
            }
            this.settingsModal.errors = {};
            this.settingsModal.visible = true;
        },

        async saveSettings() {
            this.settingsModal.loading = true;
            this.settingsModal.errors = {};
            try {
                await UserService.updateSettings({
                    invisible_cost_pct: this.parseDecimal(this.settingsModal.form.invisible_cost_pct),
                    profit_multiplier:  this.parseDecimal(this.settingsModal.form.profit_multiplier),
                });
                store.success('Configurações salvas.');
                this.settingsModal.visible = false;
            } catch (err) {
                this.settingsModal.errors = err.errors || {};
                if (!err.errors) store.error(err.message || 'Erro ao salvar configurações.');
            } finally {
                this.settingsModal.loading = false;
            }
        },
    },
    template: `
        <header class="app-header">
            <a href="/dashboard" class="header-brand">🍳 CookPrice</a>
            <nav class="header-nav">
                <a href="/ingredients" :class="{ active: activePage === 'ingredients' }">Ingredientes</a>
                <a href="/recipes"     :class="{ active: activePage === 'recipes' }">Receitas</a>
            </nav>
            <div class="header-user">
                <span class="user-name">{{ userName }}</span>
                <button class="btn btn-secondary btn-sm" @click="openSettings">Configurações</button>
                <button class="btn btn-secondary btn-sm" @click="logout">Sair</button>
            </div>
        </header>

        <app-modal
            :visible="settingsModal.visible"
            title="Configurações de Precificação"
            :loading="settingsModal.loading"
            submit-text="Salvar"
            @close="settingsModal.visible = false"
            @submit="saveSettings"
        >
            <p class="settings-hint">Esses valores são usados como padrão ao criar novas receitas.</p>
            <div class="form-group" :class="{ 'has-error': settingsModal.errors.invisible_cost_pct }">
                <label>Custos Invisíveis (%)</label>
                <input type="tel" inputmode="decimal" v-model="settingsModal.form.invisible_cost_pct" placeholder="Ex: 25" @keypress="onlyNumbers">
                <span class="field-error">{{ settingsModal.errors.invisible_cost_pct?.[0] ?? '' }}</span>
            </div>
            <div class="form-group" :class="{ 'has-error': settingsModal.errors.profit_multiplier }">
                <label>Multiplicador de Lucro</label>
                <div class="multiplier-control">
                    <input type="range" min="1" max="6" step="0.25" v-model.number="settingsModal.form.profit_multiplier">
                    <input type="tel" inputmode="decimal" v-model.number="settingsModal.form.profit_multiplier" class="multiplier-input" @keypress="onlyNumbers">
                    <span class="multiplier-suffix">x</span>
                </div>
                <p class="multiplier-hint">Margem de lucro: {{ settingsMargin }}%</p>
                <span class="field-error">{{ settingsModal.errors.profit_multiplier?.[0] ?? '' }}</span>
            </div>
        </app-modal>
    `,
};
