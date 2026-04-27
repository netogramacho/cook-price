const AppLoader = {
    name: 'AppLoader',
    computed: {
        active() { return store.loadingCount > 0; },
    },
    template: `
        <div v-if="active" class="global-loader">
            <div class="global-loader-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `,
};
