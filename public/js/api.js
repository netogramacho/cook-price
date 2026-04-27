const Api = {
    baseUrl: '/api',

    async request(method, endpoint, data = null) {
        const headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        const token = Auth.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const options = { method, headers };
        if (data !== null) {
            options.body = JSON.stringify(data);
        }

        store.startLoading();
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, options);

            if (response.status === 204) {
                return null;
            }

            const json = await response.json();

            if (response.status === 401) {
                Auth.logout();
                return;
            }

            if (!response.ok) {
                const error = new Error(json.message || 'Erro inesperado.');
                error.errors = json.errors || null;
                throw error;
            }

            return json;
        } finally {
            store.stopLoading();
        }
    },

    get(endpoint) { return this.request('GET', endpoint); },
    post(endpoint, data) { return this.request('POST', endpoint, data); },
    put(endpoint, data) { return this.request('PUT', endpoint, data); },
    patch(endpoint, data) { return this.request('PATCH', endpoint, data); },
    delete(endpoint) { return this.request('DELETE', endpoint); },
};
