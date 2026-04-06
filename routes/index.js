const express = require('express');
const Brinquedo = require('../models/Brinquedo');
const router = express.Router();

// Página inicial
router.get('/', async (req, res) => {
  try {
    const brinquedos = await Brinquedo.find({ disponivel: true }).limit(4);
    res.render('index', { brinquedos });
  } catch (error) {
    console.error(error);
    res.render('index', { brinquedos: [] });
  }
});

// Catálogo de brinquedos
router.get('/catalogo', async (req, res) => {
  try {
    const brinquedos = await Brinquedo.find({ disponivel: true });
    res.render('catalogo', { brinquedos });
  } catch (error) {
    console.error(error);
    res.render('catalogo', { brinquedos: [] });
  }
});

// Perfil do usuário
router.get('/perfil', async (req, res) => {
  if (!req.session.usuario) {
    return res.redirect('/login');
  }

  const Usuario = require('../models/Usuario');
  const usuario = await Usuario.findById(req.session.usuario.id);
  res.render('perfil', { usuario });
});

module.exports = router;