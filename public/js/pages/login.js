const LoginPage = {
    name: 'LoginPage',
    data() {
        return {
            form: { email: '', password: '' },
            errors: {},
            loading: false,
        };
    },
    methods: {
        async login() {
            this.errors = {};
            this.loading = true;
            try {
                await AuthService.login(this.form);
                this.$router.push('/dashboard');
            } catch (err) {
                if (err.errors) this.errors = err.errors;
                else store.error(err.message || 'Erro ao fazer login.');
            } finally {
                this.loading = false;
            }
        },
    },
    template: `
        <div class="auth-container">
            <div class="auth-card">
                <h1 class="auth-logo">🍳 CookPrice</h1>
                <p class="auth-subtitle">Bem-vindo de volta</p>
                <form @submit.prevent="login" novalidate>
                    <div class="form-group" :class="{ 'has-error': errors.email }">
                        <label for="email">E-mail</label>
                        <input type="email" id="email" v-model="form.email" placeholder="seu@email.com" autocomplete="email">
                        <span class="field-error">{{ errors.email?.[0] ?? '' }}</span>
                    </div>
                    <div class="form-group" :class="{ 'has-error': errors.password }">
                        <label for="password">Senha</label>
                        <input type="password" id="password" v-model="form.password" placeholder="••••••••" autocomplete="current-password">
                        <span class="field-error">{{ errors.password?.[0] ?? '' }}</span>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
                        {{ loading ? 'Entrando...' : 'Entrar' }}
                    </button>
                </form>
                <p class="auth-link">Não tem conta? <a href="/register">Criar conta</a></p>
            </div>
        </div>
    `,
};
