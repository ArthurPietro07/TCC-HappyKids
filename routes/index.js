const express = require('express');
const router = express.Router();
const Brinquedo = require('../models/Brinquedo');
const Comentario = require('../models/Comentario');
const Aluguel = require('../models/Aluguel');
const moment = require('moment');

// Página inicial
router.get('/', async (req, res) => {
    try {
        // Buscar apenas brinquedos com destaque = true
        const brinquedos = await Brinquedo.find({ disponivel: true, destaque: true }).limit(3).sort({ data_cadastro: -1 });
        
        // Processar brinquedos para garantir imagem principal
        const brinquedosProcessados = brinquedos.map(brinquedo => {
            const brinquedoObj = brinquedo.toObject();
            const imagemPrincipal = brinquedo.imagens?.find(img => img.principal) || brinquedo.imagens?.[0];
            brinquedoObj.imagem_principal = imagemPrincipal ? imagemPrincipal.url : '/uploads/default.jpg';
            return brinquedoObj;
        });
        
        res.render('index', { brinquedos: brinquedosProcessados });
    } catch (error) {
        console.error(error);
        res.render('index', { brinquedos: [] });
    }
});

// Catálogo de brinquedos
router.get('/catalogo', async (req, res) => {
    try {
        const { busca, ordem } = req.query;
        let query = { disponivel: true };
        
        if (busca) {
            query.nome = { $regex: busca, $options: 'i' };
        }
        
        let sort = {};
        if (ordem === 'preco_asc') sort = { preco_diaria: 1 };
        else if (ordem === 'preco_desc') sort = { preco_diaria: -1 };
        else sort = { nome: 1 };
        
        const brinquedos = await Brinquedo.find(query).sort(sort);
        
        const brinquedosComComentarios = await Promise.all(brinquedos.map(async (brinquedo) => {
            const comentarios = await Comentario.find({ 
                brinquedo_id: brinquedo._id, 
                status: 'aprovado' 
            });
            const media = comentarios.length > 0 
                ? comentarios.reduce((acc, c) => acc + c.estrelas, 0) / comentarios.length 
                : 0;
            
            const imagemPrincipal = brinquedo.imagens?.find(img => img.principal) || brinquedo.imagens?.[0];
            
            return {
                ...brinquedo.toObject(),
                media_estrelas: media,
                total_comentarios: comentarios.length,
                imagem_principal: imagemPrincipal ? imagemPrincipal.url : '/uploads/default.jpg'
            };
        }));
        
        res.render('catalogo', { 
            brinquedos: brinquedosComComentarios, 
            busca: busca || '',
            ordem: ordem || ''
        });
    } catch (error) {
        console.error(error);
        res.render('catalogo', { brinquedos: [], busca: '', ordem: '' });
    }
});

// Página detalhada do brinquedo
router.get('/brinquedo/:id', async (req, res) => {
    try {
        const brinquedo = await Brinquedo.findById(req.params.id);
        if (!brinquedo) {
            return res.status(404).render('error', { message: 'Brinquedo não encontrado', error: {} });
        }
        
        const comentarios = await Comentario.find({ 
            brinquedo_id: brinquedo._id, 
            status: 'aprovado' 
        }).populate('usuario_id').sort({ data: -1 });
        
        const mediaEstrelas = comentarios.length > 0 
            ? comentarios.reduce((acc, c) => acc + c.estrelas, 0) / comentarios.length 
            : 0;
        
        const mesAtual = parseInt(req.query.mes) || new Date().getMonth();
        const anoAtual = parseInt(req.query.ano) || new Date().getFullYear();
        
        const primeiroDiaMes = new Date(anoAtual, mesAtual, 1);
        const ultimoDiaMes = new Date(anoAtual, mesAtual + 1, 0);
        
        const alugueisOcupados = await Aluguel.find({
            'itens.brinquedo_id': brinquedo._id,
            status: { $in: ['pago', 'ativo'] },
            data_fim: { $gte: primeiroDiaMes },
            data_inicio: { $lte: ultimoDiaMes }
        });
        
        const diasOcupados = {};
        const diasNoMes = ultimoDiaMes.getDate();
        
        for (let dia = 1; dia <= diasNoMes; dia++) {
            const dataAtual = new Date(anoAtual, mesAtual, dia);
            dataAtual.setHours(0, 0, 0, 0);
            
            let totalReservado = 0;
            
            for (const aluguel of alugueisOcupados) {
                const inicio = new Date(aluguel.data_inicio);
                inicio.setHours(0, 0, 0, 0);
                const fim = new Date(aluguel.data_fim);
                fim.setHours(23, 59, 59, 999);
                
                if (dataAtual >= inicio && dataAtual <= fim) {
                    for (const item of aluguel.itens) {
                        if (item.brinquedo_id.toString() === brinquedo._id.toString()) {
                            totalReservado += item.quantidade;
                        }
                    }
                }
            }
            
            const disponivel = Math.max(0, brinquedo.quantidade_estoque - totalReservado);
            const isPassado = dataAtual < new Date() && dataAtual.setHours(0,0,0,0) < new Date().setHours(0,0,0,0);
            
            diasOcupados[dia] = {
                disponivel: disponivel,
                totalReservado: totalReservado,
                isPassado: isPassado,
                data: dataAtual
            };
        }
        
        const mesesPortugues = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        
        res.render('brinquedo-detalhe', {
            brinquedo: brinquedo.toObject(),
            comentarios,
            mediaEstrelas,
            diasOcupados,
            user: req.session.user,
            moment: moment,
            mesAtual: mesAtual,
            anoAtual: anoAtual,
            mesesPortugues: mesesPortugues,
            diasNoMes: diasNoMes,
            primeiroDiaSemana: primeiroDiaMes.getDay()
        });
    } catch (error) {
        console.error(error);
        res.render('error', { message: 'Erro ao carregar brinquedo: ' + error.message, error: {} });
    }
});

router.get('/error', (req, res) => {
    res.render('error', { message: 'Ocorreu um erro', error: {} });
});

module.exports = router;