const RecipeService = {
    async getAll() {
        const res = await Api.get('/recipes?per_page=100');
        return res.data.data;
    },

    async getPaginated(page = 1, search = '') {
        const params = new URLSearchParams({ page });
        if (search) params.set('search', search);
        const res = await Api.get(`/recipes?${params}`);
        const paginator = res.data;
        return {
            items: paginator.data,
            meta: {
                current_page: paginator.current_page,
                last_page:    paginator.last_page,
                total:        paginator.total,
            },
        };
    },

    async getById(id) {
        const res = await Api.get(`/recipes/${id}`);
        return res.data;
    },

    async create(data) {
        await Api.post('/recipes', data);
    },

    async update(id, data) {
        const res = await Api.put(`/recipes/${id}`, data);
        return res.data;
    },

    async delete(id) {
        await Api.delete(`/recipes/${id}`);
    },

    async produce(id, data) {
        await Api.post(`/recipes/${id}/produce`, data);
    },
};
