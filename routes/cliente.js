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

// Finalizar pedido
router.post('/finalizar-pedido', async (req, res) => {
  const { itens, dataInicio, dataFim, formaPagamento } = req.body;

  try {
    let valorTotal = 0;
    const itensFormatados = [];

    for (const item of itens) {
      const brinquedo = await Brinquedo.findById(item.id);
      if (!brinquedo) {
        return res.json({ success: false, message: `Brinquedo ${item.nome} não encontrado` });
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
      valor_total: valorTotal,
      forma_pagamento: formaPagamento,
      itens: itensFormatados,
      status: 'reservado'
    });

    await novoAluguel.save();

    // Simular envio de email
    console.log(`📧 Email de confirmação enviado para ${req.session.usuario.email}`);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.json({ success: false, message: 'Erro ao finalizar pedido' });
  }
});

module.exports = router;