const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const upload = require('../config/multer');
const Brinquedo = require('../models/Brinquedo');
const Aluguel = require('../models/Aluguel');
const Usuario = require('../models/Usuario');
const Comentario = require('../models/Comentario');
const moment = require('moment');
const path = require('path');

router.use(auth.isAuthenticated);
router.use(auth.isAdmin);

// Função auxiliar para converter arquivo em Base64
const converterParaBase64 = (file) => {
    const base64Image = file.buffer.toString('base64');
    return `data:${file.mimetype};base64,${base64Image}`;
};

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const totalAlugueis = await Aluguel.countDocuments();
        const alugueisAtivos = await Aluguel.countDocuments({ status: 'ativo' });
        const totalBrinquedos = await Brinquedo.countDocuments();
        
        const inicioMes = moment().startOf('month').toDate();
        const fimMes = moment().endOf('month').toDate();
        
        const alugueisPagos = await Aluguel.find({
            pagamento_confirmado: true,
            data_pagamento: { $gte: inicioMes, $lte: fimMes }
        });
        
        const faturamentoMes = alugueisPagos.reduce((sum, aluguel) => sum + aluguel.valor_total, 0);
        
        res.render('admin/dashboard', {
            totalAlugueis,
            alugueisAtivos,
            totalBrinquedos,
            faturamentoMes
        });
    } catch (error) {
        console.error(error);
        res.render('error', { message: 'Erro ao carregar dashboard', error: {} });
    }
});

// Gerenciar Brinquedos
router.get('/brinquedos', async (req, res) => {
    try {
        const brinquedos = await Brinquedo.find().sort({ data_cadastro: -1 });
        res.render('admin/brinquedos', { brinquedos, success: req.session.success, error: req.session.error });
        delete req.session.success;
        delete req.session.error;
    } catch (error) {
        console.error(error);
        res.render('error', { message: 'Erro ao carregar brinquedos', error: {} });
    }
});

router.get('/brinquedos/:id', async (req, res) => {
    try {
        const brinquedo = await Brinquedo.findById(req.params.id);
        res.json(brinquedo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar brinquedo' });
    }
});

// Criar novo brinquedo (SALVANDO IMAGENS NO MONGODB)
router.post('/brinquedos', upload.array('imagens', 10), async (req, res) => {
    try {
        console.log('POST - Body:', req.body);
        console.log('POST - Arquivos:', req.files ? req.files.length : 0);
        
        const { nome, descricao, quantidade_estoque, preco_diaria, destaque } = req.body;
        
        const imagens = [];
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                imagens.push({
                    url: converterParaBase64(file), // Salva Base64 no MongoDB
                    filename: file.originalname,
                    principal: index === 0
                });
            });
        } else {
            imagens.push({
                url: '/uploads/default.jpg',
                filename: 'default.jpg',
                principal: true
            });
        }
        
        const brinquedo = new Brinquedo({
            nome,
            descricao,
            imagens,
            quantidade_estoque: parseInt(quantidade_estoque),
            preco_diaria: parseFloat(preco_diaria),
            disponivel: true,
            destaque: destaque === 'true' || destaque === true,
            data_cadastro: new Date()
        });
        
        await brinquedo.save();
        req.session.success = 'Brinquedo cadastrado com sucesso';
        res.redirect('/admin/brinquedos');
    } catch (error) {
        console.error('Erro ao cadastrar:', error);
        req.session.error = 'Erro ao cadastrar brinquedo: ' + error.message;
        res.redirect('/admin/brinquedos');
    }
});

// Atualizar brinquedo (SALVANDO IMAGENS NO MONGODB)
router.put('/brinquedos/:id', upload.array('imagens', 10), async (req, res) => {
    try {
        console.log('PUT - Body:', req.body);
        console.log('PUT - Arquivos:', req.files ? req.files.length : 0);
        
        const { nome, descricao, quantidade_estoque, preco_diaria, disponivel, destaque, imagensExistentes } = req.body;
        
        const brinquedo = await Brinquedo.findById(req.params.id);
        if (!brinquedo) {
            return res.status(404).json({ error: 'Brinquedo não encontrado' });
        }
        
        // Mantém as imagens que o usuário não removeu
        let imagensAtuais = [];
        if (imagensExistentes && imagensExistentes !== '') {
            try {
                const filenamesExistentes = JSON.parse(imagensExistentes);
                imagensAtuais = brinquedo.imagens.filter(img => 
                    filenamesExistentes.includes(img.filename)
                );
            } catch (e) {
                imagensAtuais = brinquedo.imagens;
            }
        } else {
            imagensAtuais = brinquedo.imagens;
        }
        
        // Adiciona as novas imagens convertidas em Base64
        if (req.files && req.files.length > 0) {
            req.files.forEach((file, index) => {
                imagensAtuais.push({
                    url: converterParaBase64(file), // Salva Base64 no MongoDB
                    filename: file.originalname,
                    principal: imagensAtuais.length === 0 && index === 0
                });
            });
        }
        
        // Garante que pelo menos uma imagem seja principal
        if (imagensAtuais.length > 0 && !imagensAtuais.some(img => img.principal)) {
            imagensAtuais[0].principal = true;
        }
        
        await Brinquedo.findByIdAndUpdate(req.params.id, {
            nome,
            descricao,
            imagens: imagensAtuais,
            quantidade_estoque: parseInt(quantidade_estoque),
            preco_diaria: parseFloat(preco_diaria),
            disponivel: disponivel === 'true' || disponivel === true,
            destaque: destaque === 'true' || destaque === true
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao atualizar:', error);
        res.status(500).json({ error: 'Erro ao atualizar brinquedo: ' + error.message });
    }
});

// Definir imagem principal
router.post('/brinquedos/:id/principal', async (req, res) => {
    try {
        const { filename } = req.body;
        const brinquedo = await Brinquedo.findById(req.params.id);
        
        if (!brinquedo) {
            return res.status(404).json({ error: 'Brinquedo não encontrado' });
        }
        
        brinquedo.imagens.forEach(img => {
            img.principal = false;
        });
        
        const imagemPrincipal = brinquedo.imagens.find(img => img.filename === filename);
        if (imagemPrincipal) {
            imagemPrincipal.principal = true;
        }
        
        await brinquedo.save();
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao definir imagem principal' });
    }
});

// Excluir brinquedo
router.delete('/brinquedos/:id', async (req, res) => {
    try {
        const brinquedo = await Brinquedo.findById(req.params.id);
        
        if (!brinquedo) {
            return res.status(404).json({ error: 'Brinquedo não encontrado' });
        }
        
        // Como as imagens estão no banco (Base64), não precisamos apagar arquivos do disco
        await Brinquedo.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao excluir brinquedo' });
    }
});

// Gerenciar Aluguéis
router.get('/alugueis', async (req, res) => {
    try {
        const { status } = req.query;
        let query = {};
        if (status && status !== '') query.status = status;
        
        const alugueis = await Aluguel.find(query)
            .populate('usuario_id')
            .sort({ data_pedido: -1 });
        
        res.render('admin/alugueis', { alugueis, status: status || '', moment });
    } catch (error) {
        console.error(error);
        res.render('error', { message: 'Erro ao carregar aluguéis', error: {} });
    }
});

router.post('/alugueis/:id/confirmar-pagamento', async (req, res) => {
    try {
        const aluguel = await Aluguel.findById(req.params.id);
        if (!aluguel) {
            return res.status(404).json({ error: 'Aluguel não encontrado' });
        }
        
        aluguel.pagamento_confirmado = true;
        aluguel.status = 'pago';
        aluguel.data_pagamento = new Date();
        await aluguel.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao confirmar pagamento' });
    }
});

router.post('/alugueis/:id/cancelar', async (req, res) => {
    try {
        const aluguel = await Aluguel.findById(req.params.id);
        if (!aluguel) {
            return res.status(404).json({ error: 'Aluguel não encontrado' });
        }
        
        aluguel.status = 'cancelado';
        await aluguel.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao cancelar aluguel' });
    }
});

router.put('/alugueis/:id/status', async (req, res) => {
    try {
        const { status } = req.body;
        const aluguel = await Aluguel.findById(req.params.id);
        
        if (!aluguel) {
            return res.status(404).json({ error: 'Aluguel não encontrado' });
        }
        
        aluguel.status = status;
        await aluguel.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao atualizar status' });
    }
});

// Calendário
router.get('/calendario', async (req, res) => {
    try {
        const mes = parseInt(req.query.mes) || moment().month() + 1;
        const ano = parseInt(req.query.ano) || moment().year();
        
        const inicioMes = moment(`${ano}-${mes}-01`).startOf('day').toDate();
        const fimMes = moment(`${ano}-${mes}-${moment(`${ano}-${mes}-01`).daysInMonth()}`).endOf('day').toDate();
        
        const alugueis = await Aluguel.find({
            status: { $in: ['pago', 'ativo'] },
            data_inicio: { $lte: fimMes },
            data_fim: { $gte: inicioMes }
        }).populate('usuario_id');
        
        const ocupacao = {};
        const diasNoMes = moment(`${ano}-${mes}-01`).daysInMonth();
        
        for (let i = 1; i <= diasNoMes; i++) {
            ocupacao[i] = [];
        }
        
        for (const aluguel of alugueis) {
            const inicio = moment(aluguel.data_inicio);
            const fim = moment(aluguel.data_fim);
            
            const itensProcessados = [];
            for (const item of aluguel.itens) {
                let nomeBrinquedo = item.nome_brinquedo;
                
                if (!nomeBrinquedo || nomeBrinquedo === 'Brinquedo não identificado') {
                    try {
                        const brinquedo = await Brinquedo.findById(item.brinquedo_id);
                        if (brinquedo && brinquedo.nome) {
                            nomeBrinquedo = brinquedo.nome;
                        } else {
                            nomeBrinquedo = `Brinquedo (ID: ${item.brinquedo_id})`;
                        }
                    } catch (err) {
                        nomeBrinquedo = `Brinquedo (ID: ${item.brinquedo_id})`;
                    }
                }
                
                itensProcessados.push({
                    nome: nomeBrinquedo,
                    quantidade: item.quantidade
                });
            }
            
            for (let dia = 1; dia <= diasNoMes; dia++) {
                const dataAtual = moment(`${ano}-${mes}-${dia}`);
                
                if (dataAtual.isBetween(inicio, fim, 'day', '[]')) {
                    ocupacao[dia].push({
                        cliente: aluguel.usuario_id ? aluguel.usuario_id.nome : 'Cliente não encontrado',
                        telefone: aluguel.usuario_id ? aluguel.usuario_id.telefone : 'Não informado',
                        total: aluguel.valor_total,
                        horario: aluguel.hora_entrega,
                        endereco: aluguel.endereco_entrega || 'Endereço não informado',
                        status: aluguel.status,
                        itens: itensProcessados
                    });
                }
            }
        }
        
        res.render('admin/calendario', {
            ocupacao: ocupacao,
            mes: mes,
            ano: ano,
            moment: moment
        });
    } catch (error) {
        console.error('Erro no calendário:', error);
        res.render('error', { message: 'Erro ao carregar calendário: ' + error.message, error: {} });
    }
});

// Excluir comentários (Admin)
router.delete('/excluir-comentario/:id', async (req, res) => {
    try {
        const comentario = await Comentario.findById(req.params.id);
        
        if (!comentario) {
            return res.status(404).json({ error: 'Comentário não encontrado' });
        }
        
        await Comentario.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao excluir comentário:', error);
        res.status(500).json({ error: 'Erro ao excluir comentário' });
    }
});

module.exports = router;
