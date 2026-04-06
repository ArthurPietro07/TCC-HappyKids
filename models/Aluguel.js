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
        enum: ['reservado', 'ativo', 'concluido', 'atrasado'],
        default: 'reservado'
    },
    forma_pagamento: {
        type: String,
        required: true
    },
    itens: [{
        brinquedo_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Brinquedo'
        },
        quantidade: Number,
        preco_unitario: Number
    }]
});

module.exports = mongoose.model('Aluguel', AluguelSchema);