const RegisterPage = {
    name: 'RegisterPage',
    data() {
        return {
            form: { name: '', email: '', phone: '', password: '', password_confirmation: '' },
            errors: {},
            loading: false,
        };
    },
    methods: {
        async register() {
            this.errors = {};

            if (this.form.password !== this.form.password_confirmation) {
                this.errors = { password_confirmation: ['As senhas não conferem.'] };
                return;
            }

            this.loading = true;
            try {
                await AuthService.register(this.form);
                this.$router.push('/dashboard');
            } catch (err) {
                if (err.errors) this.errors = err.errors;
                else store.error(err.message || 'Erro ao criar conta.');
            } finally {
                this.loading = false;
            }
        },
    },
    template: `
        <div class="auth-container">
            <div class="auth-card">
                <h1 class="auth-logo">🍳 CookPrice</h1>
                <p class="auth-subtitle">Criar conta</p>
                <form @submit.prevent="register" novalidate>
                    <div class="form-group" :class="{ 'has-error': errors.name }">
                        <label for="name">Nome</label>
                        <input type="text" id="name" v-model="form.name" placeholder="Seu nome" autocomplete="name">
                        <span class="field-error">{{ errors.name?.[0] ?? '' }}</span>
                    </div>
                    <div class="form-group" :class="{ 'has-error': errors.email }">
                        <label for="email">E-mail</label>
                        <input type="email" id="email" v-model="form.email" placeholder="seu@email.com" autocomplete="email">
                        <span class="field-error">{{ errors.email?.[0] ?? '' }}</span>
                    </div>
                    <div class="form-group" :class="{ 'has-error': errors.phone }">
                        <label for="phone">Telefone</label>
                        <input type="tel" id="phone" v-model="form.phone" placeholder="(11) 99999-9999" autocomplete="tel">
                        <span class="field-error">{{ errors.phone?.[0] ?? '' }}</span>
                    </div>
                    <div class="form-group" :class="{ 'has-error': errors.password }">
                        <label for="password">Senha</label>
                        <input type="password" id="password" v-model="form.password" placeholder="Mínimo 8 caracteres" autocomplete="new-password">
                        <span class="field-error">{{ errors.password?.[0] ?? '' }}</span>
                    </div>
                    <div class="form-group" :class="{ 'has-error': errors.password_confirmation }">
                        <label for="password_confirmation">Confirmar senha</label>
                        <input type="password" id="password_confirmation" v-model="form.password_confirmation" placeholder="Repita a senha" autocomplete="new-password">
                        <span class="field-error">{{ errors.password_confirmation?.[0] ?? '' }}</span>
                    </div>
                    <button type="submit" class="btn btn-primary btn-full" :disabled="loading">
                        {{ loading ? 'Criando conta...' : 'Criar conta' }}
                    </button>
                </form>
                <p class="auth-link">Já tem conta? <a href="/login">Entrar</a></p>
            </div>
        </div>
    `,
};
