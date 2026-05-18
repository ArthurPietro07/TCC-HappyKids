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

        // Faturamento do mês
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        const alugueisMes = await Aluguel.find({
            data_pedido: { $gte: inicioMes }
        });

        const faturamentoMes = alugueisMes.reduce((sum, a) => sum + a.valor_total, 0);

        const ultimosAlugueis = await Aluguel.find()
            .populate('usuario_id', 'nome')
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
                status: a.status
            }))
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro no dashboard');
    }
});

// CRUD Brinquedos - VERSÃO CORRIGIDA
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
        // Verificar se o brinquedo está em algum aluguel ativo
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
            .populate('usuario_id', 'nome')
            .populate('itens.brinquedo_id', 'nome')
            .sort({ data_pedido: -1 });

        res.render('admin/alugueis', {
            alugueis: alugueis.map(a => ({
                id: a._id,
                usuario_nome: a.usuario_id?.nome || 'N/A',
                data_inicio: a.data_inicio,
                data_fim: a.data_fim,
                valor_total: a.valor_total,
                status: a.status,
                itens: a.itens
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

// Relatórios
router.get('/relatorios', async (req, res) => {
    try {
        // Brinquedos mais alugados
        const brinquedosMaisAlugados = await Aluguel.aggregate([
            { $unwind: '$itens' },
            {
                $group: {
                    _id: '$itens.brinquedo_id',
                    total: { $sum: '$itens.quantidade' }
                }
            },
            {
                $lookup: {
                    from: 'brinquedos',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'brinquedo'
                }
            },
            { $unwind: '$brinquedo' },
            {
                $project: {
                    nome: '$brinquedo.nome',
                    total: 1
                }
            },
            { $sort: { total: -1 } },
            { $limit: 10 }
        ]);

        res.render('admin/relatorios', { brinquedosMaisAlugados });
    } catch (error) {
        console.error(error);
        res.status(500).send('Erro ao carregar relatórios');
    }
});

router.get('/relatorios/faturamento', async (req, res) => {
    try {
        const { inicio, fim } = req.query;

        const alugueis = await Aluguel.find({
            data_pedido: {
                $gte: new Date(inicio),
                $lte: new Date(fim)
            }
        });

        const total = alugueis.reduce((sum, a) => sum + a.valor_total, 0);

        res.json({
            total,
            totalPedidos: alugueis.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao calcular faturamento' });
    }
});

// Calendário de ocupação
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
        const filter = brinquedo_id ? { 'itens.brinquedo_id': brinquedo_id } : {};

        const alugueis = await Aluguel.find(filter);

        const ocupacoes = [];
        alugueis.forEach(aluguel => {
            let dataAtual = new Date(aluguel.data_inicio);
            const dataFim = new Date(aluguel.data_fim);

            while (dataAtual <= dataFim) {
                const dataStr = dataAtual.toISOString().split('T')[0];
                ocupacoes.push({
                    data: dataStr,
                    quantidade: aluguel.itens.reduce((sum, item) => sum + item.quantidade, 0)
                });
                dataAtual.setDate(dataAtual.getDate() + 1);
            }
        });

        res.json(ocupacoes);
    } catch (error) {
        res.status(500).json({ error: 'Erro ao carregar ocupações' });
    }
});

module.exports = router;