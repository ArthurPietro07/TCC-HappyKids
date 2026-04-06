const express = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const router = express.Router();

// Página de login
router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Processar login
router.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    try {
        const usuario = await Usuario.findOne({ email });

        if (!usuario) {
            return res.render('login', { error: 'E-mail ou senha inválidos!' });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.render('login', { error: 'E-mail ou senha inválidos!' });
        }

        req.session.usuario = {
            id: usuario._id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo
        };

        if (usuario.tipo === 'admin') {
            res.redirect('/admin/dashboard');
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error(error);
        res.render('login', { error: 'Erro ao fazer login!' });
    }
});

// Página de cadastro
router.get('/cadastro', (req, res) => {
    res.render('cadastro', { error: null });
});

// Processar cadastro
router.post('/cadastro', async (req, res) => {
    const { nome, email, senha, telefone } = req.body;

    try {
        const usuarioExistente = await Usuario.findOne({ email });

        if (usuarioExistente) {
            return res.render('cadastro', { error: 'E-mail já cadastrado!' });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const novoUsuario = new Usuario({
            nome,
            email,
            senha: senhaHash,
            telefone,
            tipo: 'cliente'
        });

        await novoUsuario.save();

        res.render('login', { success: 'Cadastro realizado com sucesso! Faça login.' });
    } catch (error) {
        console.error(error);
        res.render('cadastro', { error: 'Erro ao cadastrar!' });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

module.exports = router;