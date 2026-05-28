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

// Verificar disponibilidade - CORRIGIDO
router.post('/verificar-disponibilidade', async (req, res) => {
    const { brinquedoId, dataInicio, dataFim, quantidade } = req.body;

    try {
        const brinquedo = await Brinquedo.findById(brinquedoId);
        if (!brinquedo) {
            return res.json({ disponivel: false, message: 'Brinquedo não encontrado' });
        }

        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        
        // Buscar TODOS os aluguéis que ocupam QUALQUER dia do período
        const alugueisConflitantes = await Aluguel.find({
            'itens.brinquedo_id': brinquedoId,
            status: { $in: ['reservado', 'ativo', 'aguardando_pagamento', 'pago'] },
            $or: [
                { data_inicio: { $lte: fim }, data_fim: { $gte: inicio } }
            ]
        });

        // Verificar DIA A DIA
        let dataAtual = new Date(inicio);
        let indisponivel = false;
        let mensagemErro = '';
        let diasOcupadosDetalhe = [];
        
        while (dataAtual <= fim) {
            let quantidadeNoDia = 0;
            const dataStr = dataAtual.toISOString().split('T')[0];
            
            for (const aluguel of alugueisConflitantes) {
                const inicioAluguel = new Date(aluguel.data_inicio);
                const fimAluguel = new Date(aluguel.data_fim);
                
                if (dataAtual >= inicioAluguel && dataAtual <= fimAluguel) {
                    for (const item of aluguel.itens) {
                        if (item.brinquedo_id.toString() === brinquedoId) {
                            quantidadeNoDia += item.quantidade;
                        }
                    }
                }
            }
            
            const disponivelNoDia = brinquedo.quantidade_estoque - quantidadeNoDia;
            const quantidadeSolicitada = quantidade || 1;
            
            if (disponivelNoDia < quantidadeSolicitada) {
                indisponivel = true;
                mensagemErro = `❌ Dia ${dataAtual.toLocaleDateString()}: apenas ${disponivelNoDia} unidade(s) disponível(is) (estoque total: ${brinquedo.quantidade_estoque})`;
                break;
            }
            
            if (quantidadeNoDia > 0) {
                diasOcupadosDetalhe.push({ data: dataStr, quantidade: quantidadeNoDia });
            }
            
            dataAtual.setDate(dataAtual.getDate() + 1);
        }
        
        if (indisponivel) {
            return res.json({
                disponivel: false,
                estoqueTotal: brinquedo.quantidade_estoque,
                message: mensagemErro
            });
        }
        
        let mensagem = '';
        if (diasOcupadosDetalhe.length === 0) {
            mensagem = `✅ Disponível! ${brinquedo.quantidade_estoque} unidade(s) disponíveis no período`;
        } else {
            mensagem = `✅ Disponível! Atenção: ${diasOcupadosDetalhe.length} dia(s) com ocupação parcial. Estoque total: ${brinquedo.quantidade_estoque}`;
        }
        
        res.json({
            disponivel: true,
            estoqueTotal: brinquedo.quantidade_estoque,
            diasOcupados: diasOcupadosDetalhe,
            message: mensagem
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
    }
});

// Finalizar pedido - CORRIGIDO
router.post('/finalizar-pedido', async (req, res) => {
  const { itens, dataInicio, dataFim, horaEntrega, formaPagamento, enderecoEntrega } = req.body;

  if (!itens || itens.length === 0) {
    return res.json({ success: false, message: 'Carrinho vazio' });
  }

  if (!dataInicio || !dataFim) {
    return res.json({ success: false, message: 'Datas não informadas' });
  }

  try {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    
    let valorTotal = 0;
    const itensFormatados = [];

    for (const item of itens) {
      const brinquedoId = item.id || item._id;
      
      if (!brinquedoId) {
        return res.json({ success: false, message: `Item ${item.nome} não tem ID válido` });
      }

      const brinquedo = await Brinquedo.findById(brinquedoId);
      
      if (!brinquedo) {
        return res.json({ success: false, message: `Brinquedo ${item.nome} não encontrado` });
      }

      // Verificar DIA A DIA
      let dataAtual = new Date(inicio);
      let indisponivel = false;
      let mensagemErro = '';
      
      while (dataAtual <= fim) {
        const alugueisNoDia = await Aluguel.find({
          'itens.brinquedo_id': brinquedoId,
          status: { $in: ['reservado', 'ativo', 'aguardando_pagamento', 'pago'] },
          data_inicio: { $lte: dataAtual },
          data_fim: { $gte: dataAtual }
        });
        
        let quantidadeNoDia = 0;
        for (const aluguel of alugueisNoDia) {
          for (const itemAluguel of aluguel.itens) {
            if (itemAluguel.brinquedo_id.toString() === brinquedoId) {
              quantidadeNoDia += itemAluguel.quantidade;
            }
          }
        }
        
        const disponivelNoDia = brinquedo.quantidade_estoque - quantidadeNoDia;
        
        if (disponivelNoDia < item.quantidade) {
          indisponivel = true;
          mensagemErro = `"${brinquedo.nome}" indisponível para o dia ${dataAtual.toLocaleDateString()}. Disponível: ${disponivelNoDia} unidade(s)`;
          break;
        }
        
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
      
      if (indisponivel) {
        return res.json({ success: false, message: mensagemErro });
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
      data_inicio: inicio,
      data_fim: fim,
      hora_entrega: horaEntrega || '08:00',
      periodo_tipo: 'diaria',
      valor_total: valorTotal,
      forma_pagamento: formaPagamento,
      itens: itensFormatados,
      status: 'aguardando_pagamento',
      pagamento_confirmado: false,
      endereco_entrega: enderecoEntrega || ''
    });

    await novoAluguel.save();

    console.log(`📧 Pedido #${novoAluguel._id} criado por ${req.session.usuario.email}`);
    
    res.json({ success: true, message: 'Pedido realizado com sucesso!' });
    
  } catch (error) {
    console.error('Erro ao finalizar pedido:', error);
    res.json({ success: false, message: 'Erro interno ao processar pedido' });
  }
});

// Cancelar pedido (Cliente)
router.post('/cancelar/:id', async (req, res) => {
  try {
    const aluguel = await Aluguel.findOne({ 
      _id: req.params.id, 
      usuario_id: req.session.usuario.id 
    });

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

// Buscar dias indisponíveis - IGNORAR CANCELADOS
router.get('/dias-indisponiveis/:brinquedoId', async (req, res) => {
  const { brinquedoId } = req.params;

  try {
    const alugueis = await Aluguel.find({
      'itens.brinquedo_id': brinquedoId,
      status: { $in: ['reservado', 'ativo', 'aguardando_pagamento', 'pago'] }
    });

    const diasIndisponiveis = [];

    alugueis.forEach(aluguel => {
      let dataAtual = new Date(aluguel.data_inicio);
      const dataFim = new Date(aluguel.data_fim);

      while (dataAtual <= dataFim) {
        const dataStr = dataAtual.toISOString().split('T')[0];
        diasIndisponiveis.push(dataStr);
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
    });

    res.json({ diasIndisponiveis });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar dias indisponíveis' });
  }
});

module.exports = router;