// Mixin que expõe funções de formatação para qualquer componente Vue.
// Usar com: mixins: [FormattersMixin]
const FormattersMixin = {
    methods: {
        fmtCurrency(val) {
            const n = Number(val);
            return new Intl.NumberFormat('pt-BR', {
                minimumFractionDigits: n % 1 === 0 ? 0 : 2,
                maximumFractionDigits: 2,
            }).format(n);
        },

        fmtQuantity(val) {
            const n = Number(val);
            return new Intl.NumberFormat('pt-BR', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 3,
            }).format(n);
        },

        fmtPricePerUnit(price, packageSize) {
            const n = Number(price) / Number(packageSize);
            return new Intl.NumberFormat('pt-BR', {
                minimumFractionDigits: n % 1 === 0 ? 0 : 2,
                maximumFractionDigits: 2,
            }).format(n);
        },
    },
};
