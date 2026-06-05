const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Configuração do nodemailer (exemplo com ethereal.email para teste)
const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'teste@ethereal.email', // Substituir por credenciais reais
        pass: 'teste123'
    }
});

// Login
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
        
        const redirectTo = req.session.redirectTo || (usuario.tipo === 'admin' ? '/admin/dashboard' : '/');
        delete req.session.redirectTo;
        res.redirect(redirectTo);
    } catch (error) {
        req.session.error = 'Erro ao fazer login';
        res.redirect('/auth/login');
    }
});

// Cadastro
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
        req.session.error = 'Erro ao cadastrar';
        res.redirect('/auth/cadastro');
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// Esqueceu senha
router.get('/esqueceu-senha', (req, res) => {
    res.render('esqueceu-senha', { error: req.session.error, success: req.session.success });
});

router.post('/esqueceu-senha', async (req, res) => {
    try {
        const { email } = req.body;
        const usuario = await Usuario.findOne({ email: email.toLowerCase() });
        
        if (!usuario) {
            req.session.error = 'Email não encontrado';
            return res.redirect('/auth/esqueceu-senha');
        }
        
        const token = crypto.randomBytes(32).toString('hex');
        usuario.resetToken = token;
        usuario.resetTokenExpiry = Date.now() + 3600000; // 1 hora
        await usuario.save();
        
        // Enviar email com link de redefinição
        const resetUrl = `http://localhost:3000/auth/redefinir-senha/${token}`;
        
        req.session.success = 'Email de recuperação enviado!';
        res.redirect('/auth/esqueceu-senha');
    } catch (error) {
        req.session.error = 'Erro ao processar solicitação';
        res.redirect('/auth/esqueceu-senha');
    }
});

// Redefinir senha
router.get('/redefinir-senha/:token', async (req, res) => {
    try {
        const usuario = await Usuario.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() }
        });
        
        if (!usuario) {
            req.session.error = 'Token inválido ou expirado';
            return res.redirect('/auth/esqueceu-senha');
        }
        
        res.render('redefinir-senha', { token: req.params.token });
    } catch (error) {
        res.redirect('/auth/esqueceu-senha');
    }
});

router.post('/redefinir-senha/:token', async (req, res) => {
    try {
        const { senha, confirmar_senha } = req.body;
        
        if (senha !== confirmar_senha) {
            req.session.error = 'As senhas não coincidem';
            return res.redirect(`/auth/redefinir-senha/${req.params.token}`);
        }
        
        const usuario = await Usuario.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() }
        });
        
        if (!usuario) {
            req.session.error = 'Token inválido ou expirado';
            return res.redirect('/auth/esqueceu-senha');
        }
        
        usuario.senha = bcrypt.hashSync(senha, 10);
        usuario.resetToken = undefined;
        usuario.resetTokenExpiry = undefined;
        await usuario.save();
        
        req.session.success = 'Senha redefinida com sucesso! Faça login';
        res.redirect('/auth/login');
    } catch (error) {
        req.session.error = 'Erro ao redefinir senha';
        res.redirect(`/auth/redefinir-senha/${req.params.token}`);
    }
});

module.exports = router;