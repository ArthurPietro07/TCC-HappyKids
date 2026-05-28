const mongoose = require('mongoose');

const AluguelSchema = new mongoose.Schema({
    usuario_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    data_pedido: {
        type: Date,
        default: Date.now
    },
    data_inicio: {
        type: Date,
        required: true
    },
    data_fim: {
        type: Date,
        required: true
    },
    hora_entrega: {
        type: String,
        required: true
    },
    periodo_tipo: {
        type: String,
        enum: ['diaria', 'semanal'],
        default: 'diaria'
    },
    valor_total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['reservado', 'ativo', 'concluido', 'atrasado', 'aguardando_pagamento', 'pago', 'cancelado'],
        default: 'reservado'
    },
    forma_pagamento: {
        type: String,
        enum: ['dinheiro', 'cartao', 'pix', 'pagar_retirada'],
        required: true
    },
    pagamento_confirmado: {
        type: Boolean,
        default: false
    },
    data_pagamento: {
        type: Date
    },
    endereco_entrega: {
        type: String,
        default: ''
    },
    itens: [{
        brinquedo_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Brinquedo',
            required: true
        },
        quantidade: {
            type: Number,
            required: true,
            min: 1
        },
        preco_unitario: {
            type: Number,
            required: true
        }
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Aluguel', AluguelSchema);