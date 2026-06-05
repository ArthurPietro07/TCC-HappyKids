// models/Comentario.js
const mongoose = require('mongoose');

const ComentarioSchema = new mongoose.Schema({
    brinquedo_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Brinquedo',
        required: true
    },
    usuario_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Usuario',
        required: true
    },
    texto: {
        type: String,
        required: true
    },
    estrelas: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    data: {
        type: Date,
        default: Date.now
    },
    status: {
        type: String,
        enum: ['aprovado', 'reprovado'],
        default: 'aprovado'
    }
});

module.exports = mongoose.model('Comentario', ComentarioSchema);