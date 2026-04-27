const NotificationContainer = {
    name: 'NotificationContainer',
    data() {
        return { store };
    },
    template: `
        <div id="notification-container">
            <transition-group name="notif">
                <div
                    v-for="n in store.notifications"
                    :key="n.id"
                    :class="['notification', 'notification-' + n.type]"
                >{{ n.message }}</div>
            </transition-group>
        </div>
    `,
};
