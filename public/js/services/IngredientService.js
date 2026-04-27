const IngredientService = {
    async getAll() {
        const res = await Api.get('/ingredients');
        return res.data.data;
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
