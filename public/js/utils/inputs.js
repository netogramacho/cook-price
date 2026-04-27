// Mixin com handlers de eventos para inputs do formulário.
// Usar com: mixins: [InputsMixin]
const InputsMixin = {
    methods: {
        onlyNumbers(e) {
            if (!/[0-9.,]/.test(e.key)) e.preventDefault();
        },

        parseDecimal(val) {
            const str = String(val).trim();
            if (str.includes(',')) {
                return parseFloat(str.replace(/\./g, '').replace(',', '.'));
            }
            return parseFloat(str);
        },
    },
};
