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
        required: true
    },
    tipo: {
        type: String,
        enum: ['cliente', 'admin'],
        default: 'cliente'
    },
    data_cadastro: {
        type: Date,
        default: Date.now
    },
    resetToken: String,
    resetTokenExpiry: Date
});

module.exports = mongoose.model('Usuario', UsuarioSchema);