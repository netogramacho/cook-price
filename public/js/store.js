const store = Vue.reactive({
    notifications: [],
    loadingCount: 0,

    startLoading() { this.loadingCount++; },
    stopLoading()  { if (this.loadingCount > 0) this.loadingCount--; },

    success(message) { this._add(message, 'success'); },
    error(message)   { this._add(message, 'error'); },

    _add(message, type) {
        const id = Date.now() + Math.random();
        this.notifications.push({ id, message, type });
        setTimeout(() => {
            const idx = this.notifications.findIndex(n => n.id === id);
            if (idx !== -1) this.notifications.splice(idx, 1);
        }, 3000);
    },
});
