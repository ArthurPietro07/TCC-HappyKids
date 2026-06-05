const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');

// ==================== LOGIN ====================
router.get('/login', (req, res) => {
    res.render('login', { error: req.session.error, success: req.session.success });
});

router.post('/login', async (req, res) => {
    try {
        const { email, senha } = req.body;
        const usuario = await Usuario.findOne({ email: email.toLowerCase() });
        
        if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
            req.session.error = 'Email ou senha inválidos';
            return res.redirect('/auth/login');
        }
        
        req.session.user = {
            id: usuario._id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo
        };
        
        req.session.success = 'Login realizado com sucesso!';
        const redirectTo = req.session.redirectTo || (usuario.tipo === 'admin' ? '/admin/dashboard' : '/');
        delete req.session.redirectTo;
        res.redirect(redirectTo);
    } catch (error) {
        console.error(error);
        req.session.error = 'Erro ao fazer login';
        res.redirect('/auth/login');
    }
});

// ==================== CADASTRO ====================
router.get('/cadastro', (req, res) => {
    res.render('cadastro', { error: req.session.error });
});

router.post('/cadastro', async (req, res) => {
    try {
        const { nome, email, telefone, senha, confirmar_senha } = req.body;
        
        if (senha !== confirmar_senha) {
            req.session.error = 'As senhas não coincidem';
            return res.redirect('/auth/cadastro');
        }
        
        if (senha.length < 6) {
            req.session.error = 'A senha deve ter pelo menos 6 caracteres';
            return res.redirect('/auth/cadastro');
        }
        
        const usuarioExists = await Usuario.findOne({ email: email.toLowerCase() });
        if (usuarioExists) {
            req.session.error = 'Email já cadastrado';
            return res.redirect('/auth/cadastro');
        }
        
        const usuario = new Usuario({
            nome,
            email: email.toLowerCase(),
            telefone,
            senha: bcrypt.hashSync(senha, 10),
            tipo: 'cliente',
            data_cadastro: new Date()
        });
        
        await usuario.save();
        
        req.session.success = 'Cadastro realizado com sucesso! Faça login';
        res.redirect('/auth/login');
    } catch (error) {
        console.error(error);
        req.session.error = 'Erro ao cadastrar';
        res.redirect('/auth/cadastro');
    }
});

// ==================== LOGOUT ====================
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


module.exports = router;