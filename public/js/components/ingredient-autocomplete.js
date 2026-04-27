const IngredientAutocomplete = {
    name: 'IngredientAutocomplete',
    props: {
        modelValue:  { type: String, default: '' },
        options:     { type: Array,  default: () => [] },
        placeholder: { type: String, default: 'Buscar ingrediente...' },
    },
    emits: ['update:modelValue'],
    data() {
        return {
            search: '',
            open: false,
        };
    },
    computed: {
        filtered() {
            const q = this.search.trim().toLowerCase();
            if (!q) return this.options;
            return this.options.filter(o => o.name.toLowerCase().includes(q));
        },
    },
    watch: {
        modelValue: {
            immediate: true,
            handler(id) {
                if (!id) { this.search = ''; return; }
                const found = this.options.find(o => o.id === id);
                if (found) this.search = found.name;
            },
        },
    },
    methods: {
        onInput() {
            this.open = true;
            if (!this.search.trim()) this.$emit('update:modelValue', '');
        },
        select(option) {
            this.search = option.name;
            this.open = false;
            this.$emit('update:modelValue', option.id);
        },
        onBlur() {
            // Delay allows mousedown on dropdown item to fire before blur closes it
            setTimeout(() => { this.open = false; }, 150);
        },
    },
    template: `
        <div class="autocomplete">
            <input
                type="text"
                v-model="search"
                :placeholder="placeholder"
                @input="onInput"
                @focus="open = true"
                @blur="onBlur"
                autocomplete="off"
            >
            <div v-if="open && (filtered.length || search.trim())" class="autocomplete-dropdown">
                <div v-if="!filtered.length" class="autocomplete-empty">Nenhum resultado.</div>
                <ul v-else>
                    <li v-for="o in filtered" :key="o.id" @mousedown.prevent="select(o)">
                        {{ o.name }} <span class="autocomplete-unit">({{ o.unit }})</span>
                    </li>
                </ul>
            </div>
        </div>
    `,
};
