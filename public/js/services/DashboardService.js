const DashboardService = {
    async get() {
        const json = await Api.get('/dashboard');
        return json.data;
    },
};
