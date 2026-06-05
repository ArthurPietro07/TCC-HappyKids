const mongoose = require('mongoose');

const BrinquedoSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true
    },
    descricao: {
        type: String,
        required: true
    },
    imagens: [{
        url: String,
        filename: String,
        principal: { type: Boolean, default: false }
    }],
    quantidade_estoque: {
        type: Number,
        required: true,
        min: 0
    },
    preco_diaria: {
        type: Number,
        required: true,
        min: 0
    },
    disponivel: {
        type: Boolean,
        default: true
    },
    destaque: {
        type: Boolean,
        default: false
    },
    data_cadastro: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Brinquedo', BrinquedoSchema);