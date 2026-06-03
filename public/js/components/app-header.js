const AppHeader = {
    name: 'AppHeader',
    components: { AppModal },
    mixins: [InputsMixin],
    props: {
        activePage: { type: String, default: '' },
    },
    data() {
        return {
            sidebarOpen: false,
            changePasswordModal: {
                visible: false,
                loading: false,
                errors: {},
                form: { current_password: '', password: '', password_confirmation: '' },
            },
            settingsModal: {
                visible: false,
                loading: false,
                errors: {},
                form: { invisible_cost_pct: '', profit_multiplier: 3, disable_stock_control: false },
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

        openChangePassword() {
            this.changePasswordModal.form   = { current_password: '', password: '', password_confirmation: '' };
            this.changePasswordModal.errors = {};
            this.changePasswordModal.visible = true;
        },

        async savePassword() {
            this.changePasswordModal.loading = true;
            this.changePasswordModal.errors  = {};
            try {
                await UserService.changePassword(this.changePasswordModal.form);
                store.success('Senha alterada com sucesso.');
                this.changePasswordModal.visible = false;
            } catch (err) {
                this.changePasswordModal.errors = err.errors || {};
                if (!err.errors) store.error(err.message || 'Erro ao alterar senha.');
            } finally {
                this.changePasswordModal.loading = false;
            }
        },

        async openSettings() {
            try {
                const user = await UserService.get();
                this.settingsModal.form = {
                    invisible_cost_pct:    Number(user.invisible_cost_pct),
                    profit_multiplier:     Number(user.profit_multiplier),
                    disable_stock_control: Boolean(user.disable_stock_control),
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
                    invisible_cost_pct:    this.parseDecimal(this.settingsModal.form.invisible_cost_pct),
                    profit_multiplier:     this.parseDecimal(this.settingsModal.form.profit_multiplier),
                    disable_stock_control: this.settingsModal.form.disable_stock_control,
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
        <div class="mobile-topbar">
            <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen" aria-label="Menu">
                <span></span><span></span><span></span>
            </button>
            <a href="/dashboard" class="header-brand">🍳 CookPrice</a>
        </div>

        <div v-if="sidebarOpen" class="sidebar-overlay" @click="sidebarOpen = false"></div>

        <aside :class="['app-sidebar', { 'sidebar-open': sidebarOpen }]">
            <div class="sidebar-brand">
                <a href="/dashboard" class="header-brand">🍳 CookPrice</a>
            </div>
            <nav class="sidebar-nav">
                <a href="/dashboard"   :class="{ active: activePage === 'dashboard' }">📊 Dashboard</a>
                <a href="/ingredients" :class="{ active: activePage === 'ingredients' }">🥕 Ingredientes</a>
                <a href="/recipes"     :class="{ active: activePage === 'recipes' }">📖 Receitas</a>
                <a href="/stock"       :class="{ active: activePage === 'stock' }">📦 Estoque</a>
            </nav>
            <div class="sidebar-user">
                <span class="user-name">{{ userName }}</span>
                <button class="btn btn-secondary btn-sm btn-full" @click="openSettings">Configurações</button>
                <button class="btn btn-secondary btn-sm btn-full" @click="openChangePassword">Alterar Senha</button>
                <button class="btn btn-secondary btn-sm btn-full" @click="logout">Sair</button>
            </div>
        </aside>

        <app-modal
            :visible="changePasswordModal.visible"
            title="Alterar Senha"
            :loading="changePasswordModal.loading"
            submit-text="Salvar"
            @close="changePasswordModal.visible = false"
            @submit="savePassword"
        >
            <div class="form-group" :class="{ 'has-error': changePasswordModal.errors.current_password }">
                <label>Senha atual</label>
                <input type="password" v-model="changePasswordModal.form.current_password" autocomplete="current-password">
                <span class="field-error">{{ changePasswordModal.errors.current_password?.[0] ?? '' }}</span>
            </div>
            <div class="form-group" :class="{ 'has-error': changePasswordModal.errors.password }">
                <label>Nova senha</label>
                <input type="password" v-model="changePasswordModal.form.password" autocomplete="new-password">
                <span class="field-error">{{ changePasswordModal.errors.password?.[0] ?? '' }}</span>
            </div>
            <div class="form-group" :class="{ 'has-error': changePasswordModal.errors.password_confirmation }">
                <label>Confirmar nova senha</label>
                <input type="password" v-model="changePasswordModal.form.password_confirmation" autocomplete="new-password">
                <span class="field-error">{{ changePasswordModal.errors.password_confirmation?.[0] ?? '' }}</span>
            </div>
        </app-modal>

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
            <div class="form-group settings-toggle-group">
                <div class="settings-toggle-row">
                    <div>
                        <span class="settings-toggle-title">Desativar controle de estoque</span>
                        <p class="multiplier-hint" style="margin-top:2px">Ao produzir, o estoque dos ingredientes não será deduzido.</p>
                    </div>
                    <label class="switch">
                        <input type="checkbox" v-model="settingsModal.form.disable_stock_control">
                        <span class="switch-slider"></span>
                    </label>
                </div>
            </div>
        </app-modal>
    `,
};
