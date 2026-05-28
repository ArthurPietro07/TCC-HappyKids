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
        default: 1,
        min: 0
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

// Brinquedo sempre visível, mesmo com estoque 0
// A validação será feita na hora do aluguel

module.exports = mongoose.model('Brinquedo', BrinquedoSchema);