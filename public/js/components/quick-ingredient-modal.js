const QuickIngredientModal = {
    name: 'QuickIngredientModal',
    components: { AppModal },
    mixins: [FormattersMixin, InputsMixin],
    props: {
        visible:     { type: Boolean, required: true },
        initialName: { type: String,  default: '' },
        forceType:   { type: String,  default: null }, // 'ingredient' | 'packaging' | null
    },
    emits: ['created', 'close'],
    data() {
        return {
            step:    'type-select',
            loading: false,
            errors:  {},
            form:    { name: '', type: '', unit: '', package_size: '', last_price: '' },
        };
    },
    watch: {
        visible(val) {
            if (val) this.reset();
        },
    },
    methods: {
        reset() {
            this.loading = false;
            this.errors  = {};
            this.form    = { name: this.initialName, type: this.forceType || '', unit: '', package_size: '', last_price: '' };
            this.step    = this.forceType ? 'form' : 'type-select';
        },
        selectType(type) {
            this.form.type = type;
            this.step = 'form';
        },
        async save() {
            this.loading = true;
            this.errors  = {};
            try {
                const ingredient = await IngredientService.create({
                    ...this.form,
                    package_size: this.parseDecimal(this.form.package_size),
                    last_price:   this.parseDecimal(this.form.last_price),
                });
                this.$emit('created', ingredient);
            } catch (err) {
                this.errors = err.errors || {};
                if (!err.errors) store.error(err.message || 'Erro ao criar ingrediente.');
            } finally {
                this.loading = false;
            }
        },
    },
    template: `
        <app-modal
            :visible="visible"
            :title="step === 'type-select' ? 'Novo Ingrediente' : (form.type === 'ingredient' ? 'Novo Ingrediente' : 'Nova Embalagem')"
            hide-actions
            @close="$emit('close')"
        >
            <template v-if="step === 'type-select'">
                <div class="type-select">
                    <p class="type-select-label">O que você está cadastrando?</p>
                    <div class="type-select-cards">
                        <button type="button" class="type-card" @click="selectType('ingredient')">
                            <strong>Ingrediente</strong>
                            <span>Farinha, manteiga, ovos...</span>
                        </button>
                        <button type="button" class="type-card" @click="selectType('packaging')">
                            <strong>Embalagem</strong>
                            <span>Caixa, saco, etiqueta...</span>
                        </button>
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" @click="$emit('close')">Cancelar</button>
                </div>
            </template>
            <template v-else>
                <div class="form-group" :class="{ 'has-error': errors.name }">
                    <label>Nome</label>
                    <input type="text" v-model="form.name" placeholder="Ex: Farinha de Trigo">
                    <span class="field-error">{{ errors.name?.[0] ?? '' }}</span>
                </div>
                <div class="form-group" :class="{ 'has-error': errors.unit }">
                    <label>Unidade</label>
                    <select v-model="form.unit">
                        <option value="">Selecione...</option>
                        <option value="g">g (gramas)</option>
                        <option value="ml">ml (mililitros)</option>
                        <option value="un">un (unidade)</option>
                    </select>
                    <span class="field-error">{{ errors.unit?.[0] ?? '' }}</span>
                </div>
                <div class="form-group" :class="{ 'has-error': errors.package_size }">
                    <label>Tamanho do Pacote</label>
                    <input type="tel" inputmode="decimal" v-model="form.package_size" placeholder="Ex: 500" @keypress="onlyNumbers">
                    <span class="field-error">{{ errors.package_size?.[0] ?? '' }}</span>
                </div>
                <div class="form-group" :class="{ 'has-error': errors.last_price }">
                    <label>Preço do Pacote (R$)</label>
                    <input type="tel" inputmode="decimal" v-model="form.last_price" placeholder="0,00" @keypress="onlyNumbers">
                    <span class="field-error">{{ errors.last_price?.[0] ?? '' }}</span>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" :disabled="loading" @click="forceType ? $emit('close') : (step = 'type-select')">
                        {{ forceType ? 'Cancelar' : '← Voltar' }}
                    </button>
                    <button type="button" class="btn btn-primary" :disabled="loading" @click="save">
                        {{ loading ? 'Salvando...' : 'Criar' }}
                    </button>
                </div>
            </template>
        </app-modal>
    `,
};
