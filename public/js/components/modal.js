const AppModal = {
    name: 'AppModal',
    props: {
        visible:    { type: Boolean, required: true },
        title:      { type: String, default: '' },
        loading:    { type: Boolean, default: false },
        submitText: { type: String, default: 'Salvar' },
        hideActions: { type: Boolean, default: false },
    },
    emits: ['close', 'submit'],
    template: `
        <div v-if="visible" class="modal-overlay" @click.self="$emit('close')">
            <div class="modal">
                <div class="modal-header">
                    <h3>{{ title }}</h3>
                    <button class="modal-close" @click="$emit('close')">&times;</button>
                </div>
                <div class="modal-body">
                    <slot></slot>
                    <div v-if="!hideActions" class="modal-actions">
                        <button type="button" class="btn btn-secondary" :disabled="loading" @click="$emit('close')">Cancelar</button>
                        <button type="button" class="btn btn-primary" :disabled="loading" @click="$emit('submit')">
                            {{ loading ? 'Salvando...' : submitText }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `,
};
