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
    imagem_url: {
        type: String,
        default: '/uploads/placeholder.jpg'
    },
    quantidade_estoque: {
        type: Number,
        default: 1
    },
    preco_diaria: {
        type: Number,
        required: true
    },
    preco_semanal: {
        type: Number,
        required: true
    },
    disponivel: {
        type: Boolean,
        default: true
    },
    data_cadastro: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Brinquedo', BrinquedoSchema);