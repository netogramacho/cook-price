const AuthService = {
    async login(credentials) {
        const res = await Api.post('/auth/login', credentials);
        Auth.setToken(res.data.token);
        Auth.setUser(res.data.user);
    },

    async register(data) {
        const res = await Api.post('/auth/register', data);
        Auth.setToken(res.data.token);
        Auth.setUser(res.data.user);
    },

    async logout() {
        try { await Api.post('/auth/logout'); } catch (_) {}
        Auth.logout();
    },
};
