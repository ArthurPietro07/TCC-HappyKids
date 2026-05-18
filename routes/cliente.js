const express = require('express');
const Aluguel = require('../models/Aluguel');
const Brinquedo = require('../models/Brinquedo');
const { isAuthenticated, isCliente } = require('../middlewares/auth');
const router = express.Router();

// Middleware para verificar autenticação
router.use(isAuthenticated);
router.use(isCliente);

// Meus aluguéis
router.get('/meus-alugueis', async (req, res) => {
  try {
    const alugueis = await Aluguel.find({ usuario_id: req.session.usuario.id })
      .populate('itens.brinquedo_id')
      .sort({ data_pedido: -1 });

    res.render('cliente/meus-alugueis', { alugueis });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar aluguéis');
  }
});

// Carrinho
router.get('/carrinho', (req, res) => {
  res.render('cliente/carrinho');
});

// Finalizar pedido - VERSÃO CORRIGIDA
router.post('/finalizar-pedido', async (req, res) => {
  const { itens, dataInicio, dataFim, formaPagamento } = req.body;

  // Validação inicial
  if (!itens || itens.length === 0) {
    return res.json({ success: false, message: 'Carrinho vazio' });
  }

  if (!dataInicio || !dataFim) {
    return res.json({ success: false, message: 'Datas não informadas' });
  }

  try {
    let valorTotal = 0;
    const itensFormatados = [];

    for (const item of itens) {
      // Aceita tanto id quanto _id
      const brinquedoId = item.id || item._id;
      
      if (!brinquedoId) {
        return res.json({ success: false, message: `Item ${item.nome} não tem ID válido` });
      }

      const brinquedo = await Brinquedo.findById(brinquedoId);
      
      if (!brinquedo) {
        return res.json({ success: false, message: `Brinquedo ${item.nome} não encontrado` });
      }

      // Verificar estoque
      if (brinquedo.quantidade_estoque < item.quantidade) {
        return res.json({ success: false, message: `Estoque insuficiente para ${brinquedo.nome}. Disponível: ${brinquedo.quantidade_estoque}` });
      }

      const precoUnitario = brinquedo.preco_diaria;
      const subtotal = precoUnitario * item.quantidade;
      valorTotal += subtotal;

      itensFormatados.push({
        brinquedo_id: brinquedo._id,
        quantidade: item.quantidade,
        preco_unitario: precoUnitario
      });
    }

    const novoAluguel = new Aluguel({
      usuario_id: req.session.usuario.id,
      data_inicio: new Date(dataInicio),
      data_fim: new Date(dataFim),
      periodo_tipo: 'diaria',
      valor_total: valorTotal,
      forma_pagamento: formaPagamento,
      itens: itensFormatados,
      status: 'reservado'
    });

    await novoAluguel.save();

    // Atualizar estoque
    for (const item of itensFormatados) {
      await Brinquedo.findByIdAndUpdate(item.brinquedo_id, {
        $inc: { quantidade_estoque: -item.quantidade }
      });
    }

    console.log(`📧 Pedido #${novoAluguel._id} criado por ${req.session.usuario.email}`);
    res.json({ success: true, message: 'Pedido realizado com sucesso!' });
    
  } catch (error) {
    console.error('Erro ao finalizar pedido:', error);
    res.json({ success: false, message: 'Erro interno ao processar pedido' });
  }
});

module.exports = router;