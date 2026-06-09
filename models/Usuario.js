const mongoose = require('mongoose');

const UsuarioSchema = new mongoose.Schema({
    nome: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true
    },
    senha: {
        type: String,
        required: true
    },
    telefone: {
        type: String,
        required: true,
        validate: {
            validator: function(v) {
                return /^\(\d{2}\) \d{4,5}-\d{4}$/.test(v);
            },
            message: 'Telefone inválido. Use o formato (00) 00000-0000'
        }
    },
    tipo: {
        type: String,
        enum: ['cliente', 'admin'],
        default: 'cliente'
    },
    data_cadastro: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Usuario', UsuarioSchema);