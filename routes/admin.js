const express = require('express');
const Brinquedo = require('../models/Brinquedo');
const Aluguel = require('../models/Aluguel');
const Usuario = require('../models/Usuario');
const { isAuthenticated, isAdmin } = require('../middlewares/auth');
const router = express.Router();

// Middlewares
router.use(isAuthenticated);
router.use(isAdmin);
router.use(express.json());
router.use(express.urlencoded({ extended: true }));

// Dashboard
router.get('/dashboard', async (req, res) => {
    try {
        const totalAlugueis = await Aluguel.countDocuments();
        const alugueisAtivos = await Aluguel.countDocuments({ status: 'ativo' });
        const totalBrinquedos = await Brinquedo.countDocuments();

        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const alugueisMes = await Aluguel.find({
            data_pedido: { $gte: inicioMes },
            pagamento_confirmado: true
        });

        const faturamentoMes = alugueisMes.reduce((sum, a) => sum + a.valor_total, 0);

        const ultimosAlugueis = await Aluguel.find()
            .populate('usuario_id', 'nome')
            .populate('itens.brinquedo_id', 'nome')
            .sort({ data_pedido: -1 })
            .limit(10);

        res.render('admin/dashboard', {
            totalAlugueis,
            alugueisAtivos,
            totalBrinquedos,
            faturamentoMes,
            ultimosAlugueis: ultimosAlugueis.map(a => ({
                id: a._id,
                usuario_nome: a.usuario_id?.nome || 'N/A',
                data_pedido: a.data_pedido,
                valor_total: a.valor_total,
                status: a.status,
                forma_pagamento: a.forma_pagamento,
                pagamento_confirmado: a.pagamento_confirmado,
                itens: a.itens.map(item => ({
                    brinquedo_nome: item.brinquedo_id?.nome || 'Brinquedo',
                    quantidade: item.quantidade
                }))
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro no dashboard');
    }
});

// CRUD Brinquedos
router.get('/brinquedos', async (req, res) => {
    try {
        const brinquedos = await Brinquedo.find().sort({ data_cadastro: -1 });
        res.render('admin/brinquedos', { brinquedos });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao carregar brinquedos');
    }
});

router.post('/brinquedos', async (req, res) => {
    try {
        const brinquedo = new Brinquedo({
            ...req.body,
            disponivel: req.body.quantidade_estoque > 0
        });
        await brinquedo.save();
        res.status(201).json({ success: true, message: 'Brinquedo criado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.get('/brinquedos/:id', async (req, res) => {
    try {
        const brinquedo = await Brinquedo.findById(req.params.id);
        if (!brinquedo) {
            return res.status(404).json({ error: 'Brinquedo não encontrado' });
        }
        res.json(brinquedo);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao buscar brinquedo' });
    }
});

router.put('/brinquedos/:id', async (req, res) => {
    try {
        const brinquedo = await Brinquedo.findByIdAndUpdate(
            req.params.id, 
            {
                ...req.body,
                disponivel: req.body.quantidade_estoque > 0
            },
            { new: true, runValidators: true }
        );
        
        if (!brinquedo) {
            return res.status(404).json({ success: false, error: 'Brinquedo não encontrado' });
        }
        
        res.json({ success: true, message: 'Brinquedo atualizado com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

router.delete('/brinquedos/:id', async (req, res) => {
    try {
        const alugueisAtivos = await Aluguel.findOne({
            'itens.brinquedo_id': req.params.id,
            status: { $in: ['reservado', 'ativo'] }
        });
        
        if (alugueisAtivos) {
            return res.status(400).json({ 
                success: false, 
                error: 'Não é possível excluir: brinquedo está em uso em aluguéis ativos' 
            });
        }
        
        const brinquedo = await Brinquedo.findByIdAndDelete(req.params.id);
        if (!brinquedo) {
            return res.status(404).json({ success: false, error: 'Brinquedo não encontrado' });
        }
        
        res.json({ success: true, message: 'Brinquedo excluído com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Gerenciar aluguéis
router.get('/alugueis', async (req, res) => {
    try {
        const { status } = req.query;
        const filter = status && status !== 'todos' ? { status } : {};

        const alugueis = await Aluguel.find(filter)
            .populate('usuario_id', 'nome email telefone')
            .populate('itens.brinquedo_id', 'nome')
            .sort({ data_pedido: -1 });

        res.render('admin/alugueis', {
            alugueis: alugueis.map(a => ({
                id: a._id,
                usuario_nome: a.usuario_id?.nome || 'N/A',
                usuario_email: a.usuario_id?.email,
                usuario_telefone: a.usuario_id?.telefone,
                data_inicio: a.data_inicio,
                data_fim: a.data_fim,
                data_pedido: a.data_pedido,
                valor_total: a.valor_total,
                status: a.status,
                forma_pagamento: a.forma_pagamento,
                pagamento_confirmado: a.pagamento_confirmado,
                data_pagamento: a.data_pagamento,
                hora_entrega: a.hora_entrega || '08:00',
                endereco_entrega: a.endereco_entrega || 'Não informado',
                itens: a.itens.map(item => ({
                    brinquedo_id: item.brinquedo_id,
                    quantidade: item.quantidade,
                    preco_unitario: item.preco_unitario
                }))
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao carregar aluguéis');
    }
});

router.put('/alugueis/:id/status', async (req, res) => {
    try {
        await Aluguel.findByIdAndUpdate(req.params.id, { status: req.body.status });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

// Confirmar pagamento em dinheiro
router.post('/alugueis/:id/confirmar-pagamento', async (req, res) => {
    try {
        const aluguel = await Aluguel.findById(req.params.id);
        
        if (!aluguel) {
            return res.status(404).json({ success: false, error: 'Aluguel não encontrado' });
        }
        
        aluguel.pagamento_confirmado = true;
        aluguel.data_pagamento = new Date();
        aluguel.status = 'pago';
        
        await aluguel.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Marcar como pago (para cartão/PIX)
router.post('/alugueis/:id/marcar-pago', async (req, res) => {
    try {
        const aluguel = await Aluguel.findById(req.params.id);
        
        if (!aluguel) {
            return res.status(404).json({ success: false, error: 'Aluguel não encontrado' });
        }
        
        aluguel.pagamento_confirmado = true;
        aluguel.data_pagamento = new Date();
        
        await aluguel.save();
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cancelar pedido (Admin)
router.post('/alugueis/:id/cancelar', async (req, res) => {
    try {
        const aluguel = await Aluguel.findById(req.params.id);

        if (!aluguel) {
            return res.status(404).json({ success: false, message: 'Pedido não encontrado' });
        }

        if (aluguel.status === 'cancelado') {
            return res.status(400).json({ success: false, message: 'Pedido já está cancelado' });
        }

        aluguel.status = 'cancelado';
        await aluguel.save();

        res.json({ success: true, message: 'Pedido cancelado com sucesso!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Erro ao cancelar pedido' });
    }
});

// Detalhes do aluguel
router.get('/alugueis/:id/detalhes', async (req, res) => {
    try {
        const aluguel = await Aluguel.findById(req.params.id)
            .populate('usuario_id', 'nome email telefone')
            .populate('itens.brinquedo_id', 'nome');
        
        if (!aluguel) {
            return res.status(404).json({ error: 'Aluguel não encontrado' });
        }
        
        res.json({
            id: aluguel._id,
            cliente: aluguel.usuario_id?.nome,
            email: aluguel.usuario_id?.email,
            telefone: aluguel.usuario_id?.telefone,
            endereco_entrega: aluguel.endereco_entrega || 'Não informado',
            hora_entrega: aluguel.hora_entrega || '08:00',
            data_pedido: aluguel.data_pedido,
            data_inicio: aluguel.data_inicio,
            data_fim: aluguel.data_fim,
            valor_total: aluguel.valor_total,
            status: aluguel.status,
            forma_pagamento: aluguel.forma_pagamento,
            pagamento_confirmado: aluguel.pagamento_confirmado,
            itens: aluguel.itens.map(item => ({
                nome: item.brinquedo_id?.nome || 'Brinquedo',
                quantidade: item.quantidade,
                preco_unitario: item.preco_unitario
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao carregar detalhes' });
    }
});

// Calendário de ocupação - CORRIGIDO (soma quantidades corretamente)
router.get('/calendario', async (req, res) => {
    try {
        const brinquedos = await Brinquedo.find();
        res.render('admin/calendario', { brinquedos });
    } catch (error) {
        res.status(500).send('Erro ao carregar calendário');
    }
});

router.get('/calendario/ocupacoes', async (req, res) => {
    try {
        const { brinquedo_id } = req.query;
        
        const filter = { status: { $in: ['reservado', 'ativo', 'aguardando_pagamento', 'pago'] } };
        
        if (brinquedo_id && brinquedo_id !== 'todos' && brinquedo_id !== 'undefined') {
            filter['itens.brinquedo_id'] = brinquedo_id;
        }

        const alugueis = await Aluguel.find(filter).populate('itens.brinquedo_id');
        
        // Mapa para somar TODAS as quantidades por dia
        const ocupacoesMap = new Map();

        alugueis.forEach(aluguel => {
            let dataAtual = new Date(aluguel.data_inicio);
            const dataFim = new Date(aluguel.data_fim);

            while (dataAtual <= dataFim) {
                const dataStr = dataAtual.toISOString().split('T')[0];
                
                let quantidadeNoDia = 0;
                
                for (const item of aluguel.itens) {
                    if (!brinquedo_id || brinquedo_id === 'todos' || brinquedo_id === 'undefined') {
                        quantidadeNoDia += item.quantidade;
                    } else if (item.brinquedo_id && item.brinquedo_id._id && item.brinquedo_id._id.toString() === brinquedo_id) {
                        quantidadeNoDia += item.quantidade;
                    } else if (item.brinquedo_id && item.brinquedo_id.toString() === brinquedo_id) {
                        quantidadeNoDia += item.quantidade;
                    }
                }
                
                if (quantidadeNoDia > 0) {
                    if (ocupacoesMap.has(dataStr)) {
                        // SOMAR, não substituir!
                        ocupacoesMap.set(dataStr, ocupacoesMap.get(dataStr) + quantidadeNoDia);
                    } else {
                        ocupacoesMap.set(dataStr, quantidadeNoDia);
                    }
                }
                
                dataAtual.setDate(dataAtual.getDate() + 1);
            }
        });

        const ocupacoes = Array.from(ocupacoesMap.entries()).map(([data, quantidade]) => ({
            data,
            quantidade
        }));

        res.json(ocupacoes);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao carregar ocupações' });
    }
});

module.exports = router;