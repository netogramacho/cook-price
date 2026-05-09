const StockService = {
    async getPaginated(page = 1, search = '') {
        const params = new URLSearchParams({ page });
        if (search) params.set('search', search);
        const res = await Api.get(`/stock?${params}`);
        const paginator = res.data;
        return {
            items: paginator.data,
            meta: { current_page: paginator.current_page, last_page: paginator.last_page, total: paginator.total },
        };
    },

    async createPurchase(data) {
        const res = await Api.post('/purchases', data);
        return res.data;
    },

    async adjust(id, data) {
        const res = await Api.patch(`/ingredients/${id}/stock`, data);
        return res.data;
    },

    async getMovements(id, page = 1) {
        const res = await Api.get(`/ingredients/${id}/movements?page=${page}`);
        const paginator = res.data;
        return {
            items: paginator.data,
            meta: { current_page: paginator.current_page, last_page: paginator.last_page },
        };
    },
};
