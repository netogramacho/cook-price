const router = VueRouter.createRouter({
    history: VueRouter.createWebHistory(),
    routes: [
        { path: '/',             redirect: '/login' },
        { path: '/login',        component: LoginPage,        meta: { public: true } },
        { path: '/register',     component: RegisterPage,     meta: { public: true } },
        { path: '/dashboard',    component: DashboardPage },
        { path: '/ingredients',  component: IngredientsPage },
        { path: '/recipes',      component: RecipesPage },
        { path: '/recipes/:id',  component: RecipeDetailPage },
        { path: '/stock',        component: StockPage },
    ],
});

router.beforeEach((to, from, next) => {
    const authenticated = Auth.isAuthenticated();
    if (!authenticated && !to.meta.public) {
        next('/login');
    } else if (authenticated && to.meta.public) {
        next('/dashboard');
    } else {
        next();
    }
});

const App = {
    components: { NotificationContainer, AppLoader },
    template: `
        <app-loader />
        <notification-container />
        <router-view />
    `,
};

Vue.createApp(App).use(router).mount('#app');

