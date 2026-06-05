const mongoose = require('mongoose');

const ItemAluguelSchema = new mongoose.Schema({
    brinquedo_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brinquedo',
        required: true
    },
    nome_brinquedo: String,
    quantidade: {
        type: Number,
        required: true,
        min: 1
    },
    preco_diaria: Number,
    subtotal: Number
});

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
    valor_total: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['aguardando_pagamento', 'pago', 'ativo', 'concluido', 'cancelado', 'atrasado'],
        default: 'aguardando_pagamento'
    },
    forma_pagamento: {
        type: String,
        enum: ['dinheiro', 'pix'],
        required: true
    },
    pagamento_confirmado: {
        type: Boolean,
        default: false
    },
    data_pagamento: Date,
    endereco_entrega: {
        type: String,
        required: true
    },
    itens: [ItemAluguelSchema]
});

module.exports = mongoose.model('Aluguel', AluguelSchema);