const RecipeService = {
    async getAll() {
        const res = await Api.get('/recipes');
        return res.data.data;
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
};
