const IngredientService = {
    async getAll() {
        const res = await Api.get('/ingredients?per_page=100');
        return res.data.data;
    },

    async getPaginated(page = 1, search = '') {
        const params = new URLSearchParams({ page });
        if (search) params.set('search', search);
        const res = await Api.get(`/ingredients?${params}`);
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

    async create(data) {
        await Api.post('/ingredients', data);
    },

    async update(id, data) {
        await Api.put(`/ingredients/${id}`, data);
    },

    async delete(id) {
        await Api.delete(`/ingredients/${id}`);
    },
};
