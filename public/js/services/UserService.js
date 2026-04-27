const UserService = {
    get() {
        return Api.get('/user').then(r => r.data);
    },

    updateSettings(data) {
        return Api.put('/user/settings', data).then(r => r.data);
    },
};
