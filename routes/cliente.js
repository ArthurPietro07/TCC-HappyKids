const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const upload = require('../config/multer');
const Aluguel = require('../models/Aluguel');
const Brinquedo = require('../models/Brinquedo');
const Comentario = require('../models/Comentario');
const Usuario = require('../models/Usuario');
const fs = require('fs');
const path = require('path');

function formatarData(data) {
    if (!data) return '';
    const d = new Date(data);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
}

function formatarDataHora(data) {
    if (!data) return '';
    const d = new Date(data);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

router.use(auth.isAuthenticated);
router.use(auth.isCliente);

// Meus aluguéis
router.get('/meus-alugueis', async (req, res) => {
    try {
        const alugueis = await Aluguel.find({ usuario_id: req.session.user.id })
            .sort({ data_pedido: -1 })
            .populate('itens.brinquedo_id');
        
        res.render('cliente/meus-alugueis', { 
            alugueis, 
            formatarData, 
            formatarDataHora
        });
    } catch (error) {
        console.error(error);
        res.render('error', { message: 'Erro ao carregar aluguéis', error: {} });
    }
});

// Cancelar aluguel
router.post('/cancelar/:id', async (req, res) => {
    try {
        const aluguel = await Aluguel.findOne({
            _id: req.params.id,
            usuario_id: req.session.user.id
        });
        
        if (!aluguel) {
            return res.status(404).json({ error: 'Aluguel não encontrado' });
        }
        
        if (aluguel.status !== 'aguardando_pagamento' && aluguel.status !== 'pago') {
            return res.status(400).json({ error: 'Este aluguel não pode ser cancelado' });
        }
        
        aluguel.status = 'cancelado';
        await aluguel.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao cancelar aluguel' });
    }
});

// Carrinho
router.get('/carrinho', (req, res) => {
    res.render('cliente/carrinho');
});

// Finalizar aluguel
router.post('/finalizar', async (req, res) => {
    try {
        const { itens, data_inicio, data_fim, quantidade_dias, hora_entrega, forma_pagamento, endereco_entrega, valor_total } = req.body;
        
        const itensParse = JSON.parse(itens);
        const inicio = new Date(data_inicio);
        const fim = new Date(data_fim);
        
        if (inicio > fim) {
            return res.status(400).json({ error: 'Data de início inválida' });
        }
        
        const itensParaSalvar = [];
        
        for (const item of itensParse) {
            const brinquedo = await Brinquedo.findById(item.id);
            if (!brinquedo) {
                return res.status(400).json({ error: `Brinquedo ${item.nome} não encontrado` });
            }
            
            const alugueisConflitantes = await Aluguel.find({
                'itens.brinquedo_id': item.id,
                status: { $in: ['pago', 'ativo'] },
                data_inicio: { $lte: fim },
                data_fim: { $gte: inicio }
            });
            
            let totalReservado = 0;
            for (const aluguel of alugueisConflitantes) {
                for (const itemAluguel of aluguel.itens) {
                    if (itemAluguel.brinquedo_id.toString() === item.id) {
                        totalReservado += itemAluguel.quantidade;
                    }
                }
            }
            
            const disponivel = brinquedo.quantidade_estoque - totalReservado;
            
            if (item.quantidade > disponivel) {
                return res.status(400).json({ 
                    error: `${brinquedo.nome}: Quantidade indisponível para o período. Disponível: ${disponivel} unidade(s)` 
                });
            }
            
            itensParaSalvar.push({
                brinquedo_id: item.id,
                nome_brinquedo: brinquedo.nome,
                quantidade: item.quantidade,
                preco_diaria: brinquedo.preco_diaria,
                subtotal: brinquedo.preco_diaria * item.quantidade
            });
        }
        
        const novoAluguel = new Aluguel({
            usuario_id: req.session.user.id,
            data_inicio: inicio,
            data_fim: fim,
            quantidade_dias: quantidade_dias || parseInt(quantidade_dias),
            hora_entrega,
            valor_total: parseFloat(valor_total),
            forma_pagamento,
            endereco_entrega,
            itens: itensParaSalvar
        });
        
        await novoAluguel.save();
        
        res.json({ success: true, aluguelId: novoAluguel._id });
    } catch (error) {
        console.error('Erro ao finalizar aluguel:', error);
        res.status(500).json({ error: 'Erro ao finalizar aluguel: ' + error.message });
    }
});

// Perfil - GET
router.get('/perfil', async (req, res) => {
    try {
        const usuario = await Usuario.findById(req.session.user.id);
        res.render('cliente/perfil', { usuario, formatarData });
    } catch (error) {
        console.error(error);
        res.render('error', { message: 'Erro ao carregar perfil', error: {} });
    }
});

// Perfil - POST (atualizar dados e avatar)
router.post('/perfil', upload.single('avatar'), async (req, res) => {
    try {
        const { nome, telefone } = req.body;
        const usuario = await Usuario.findById(req.session.user.id);
        
        // Se veio uma nova imagem, atualizar
        if (req.file) {
            // Remover avatar antigo se não for o padrão
            if (usuario.avatar && usuario.avatar !== '' && !usuario.avatar.includes('default')) {
                const oldAvatarPath = path.join(__dirname, '../public', usuario.avatar);
                if (fs.existsSync(oldAvatarPath)) {
                    fs.unlinkSync(oldAvatarPath);
                }
            }
            usuario.avatar = '/uploads/avatars/' + req.file.filename;
        }
        
        usuario.nome = nome;
        usuario.telefone = telefone;
        await usuario.save();
        
        // Atualizar sessão
        req.session.user.nome = nome;
        req.session.user.avatar = usuario.avatar;
        
        req.session.success = 'Perfil atualizado com sucesso!';
        res.redirect('/cliente/perfil');
    } catch (error) {
        console.error(error);
        req.session.error = 'Erro ao atualizar perfil';
        res.redirect('/cliente/perfil');
    }
});

// Avaliações
router.post('/avaliar', async (req, res) => {
    try {
        const { brinquedo_id, texto, estrelas } = req.body;
        
        if (!texto || texto.trim() === '') {
            return res.status(400).json({ error: 'Por favor, escreva um comentário' });
        }
        
        if (!estrelas || estrelas < 1 || estrelas > 5) {
            return res.status(400).json({ error: 'Selecione uma quantidade de estrelas' });
        }
        
        const avaliacaoExistente = await Comentario.findOne({
            brinquedo_id,
            usuario_id: req.session.user.id
        });
        
        if (avaliacaoExistente) {
            return res.status(400).json({ error: 'Você já avaliou este brinquedo' });
        }
        
        const comentario = new Comentario({
            brinquedo_id,
            usuario_id: req.session.user.id,
            texto: texto.trim(),
            estrelas: parseInt(estrelas),
            data: new Date(),
            status: 'aprovado'
        });
        
        await comentario.save();
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao enviar avaliação' });
    }
});

// Excluir próprio comentário
router.delete('/excluir-comentario/:id', async (req, res) => {
    try {
        const comentario = await Comentario.findById(req.params.id);
        
        if (!comentario) {
            return res.status(404).json({ error: 'Comentário não encontrado' });
        }
        
        if (comentario.usuario_id.toString() !== req.session.user.id && req.session.user.tipo !== 'admin') {
            return res.status(403).json({ error: 'Sem permissão' });
        }
        
        await Comentario.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir comentário' });
    }
});

module.exports = router;