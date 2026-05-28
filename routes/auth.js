const express = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const nodemailer = require('nodemailer');
const router = express.Router();

// Configuração do email (SUBSTITUA PELOS SEUS DADOS)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'seuemail@gmail.com', // 🔧 SUBSTITUA PELO SEU EMAIL
        pass: 'suasenhaapp' // 🔧 SUBSTITUA PELA SENHA DO APP
    }
});

// Página de login
router.get('/login', (req, res) => {
    res.render('login', { error: null, success: req.query.success || null });
});

// Processar login
router.post('/login', async (req, res) => {
    const { email, senha, lembrar } = req.body;

    try {
        const usuario = await Usuario.findOne({ email });

        if (!usuario) {
            return res.render('login', { error: 'Email ou senha inválidos', success: null });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.render('login', { error: 'Email ou senha inválidos', success: null });
        }

        req.session.usuario = {
            id: usuario._id,
            nome: usuario.nome,
            email: usuario.email,
            tipo: usuario.tipo,
            telefone: usuario.telefone
        };

        if (lembrar === 'true') {
            req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
        } else {
            req.session.cookie.maxAge = 7 * 24 * 60 * 60 * 1000;
        }

        if (usuario.tipo === 'admin') {
            res.redirect('/admin/dashboard');
        } else {
            res.redirect('/');
        }
    } catch (error) {
        console.error(error);
        res.render('login', { error: 'Erro ao fazer login. Tente novamente.', success: null });
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
            return res.render('cadastro', { error: 'Email já cadastrado' });
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

        req.session.usuario = {
            id: novoUsuario._id,
            nome: novoUsuario.nome,
            email: novoUsuario.email,
            tipo: novoUsuario.tipo,
            telefone: novoUsuario.telefone
        };

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.render('cadastro', { error: 'Erro ao cadastrar. Tente novamente.' });
    }
});

// Página: Esqueceu a senha
router.get('/esqueceu-senha', (req, res) => {
    res.render('esqueceu-senha', { error: null, success: null });
});

// Processar: Enviar email de recuperação
router.post('/esqueceu-senha', async (req, res) => {
    const { email } = req.body;

    try {
        const usuario = await Usuario.findOne({ email });
        
        if (!usuario) {
            return res.render('esqueceu-senha', { error: 'Email não encontrado', success: null });
        }

        const token = Buffer.from(`${usuario._id}-${Date.now()}`).toString('base64');
        
        usuario.resetToken = token;
        usuario.resetTokenExpiry = Date.now() + 3600000;
        await usuario.save();

        const resetLink = `http://localhost:3000/redefinir-senha?token=${token}`;

        await transporter.sendMail({
            from: '"HappyKids" <seuemail@gmail.com>',
            to: usuario.email,
            subject: 'Recuperação de Senha - HappyKids',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #2563eb;">Olá ${usuario.nome}!</h2>
                    <p>Recebemos uma solicitação para redefinir sua senha no HappyKids.</p>
                    <p>Clique no botão abaixo para criar uma nova senha:</p>
                    <a href="${resetLink}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 20px 0;">Redefinir Senha</a>
                    <p>Este link é válido por 1 hora.</p>
                    <p>Se você não solicitou essa alteração, ignore este email.</p>
                    <hr>
                    <p style="font-size: 12px; color: #666;">HappyKids - Aluguel de Brinquedos</p>
                </div>
            `
        });

        res.render('esqueceu-senha', { 
            error: null, 
            success: 'Email enviado! Verifique sua caixa de entrada para redefinir a senha.' 
        });
    } catch (error) {
        console.error(error);
        res.render('esqueceu-senha', { error: 'Erro ao enviar email. Tente novamente.', success: null });
    }
});

// Página: Redefinir senha
router.get('/redefinir-senha', async (req, res) => {
    const { token } = req.query;
    
    try {
        const usuario = await Usuario.findOne({ 
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });
        
        if (!usuario) {
            return res.render('redefinir-senha', { error: 'Link inválido ou expirado.', token: null });
        }
        
        res.render('redefinir-senha', { error: null, token });
    } catch (error) {
        console.error(error);
        res.render('redefinir-senha', { error: 'Erro ao processar solicitação.', token: null });
    }
});

// Processar: Salvar nova senha
router.post('/redefinir-senha', async (req, res) => {
    const { token, senha, confirmarSenha } = req.body;
    
    if (senha !== confirmarSenha) {
        return res.render('redefinir-senha', { error: 'As senhas não coincidem.', token });
    }
    
    try {
        const usuario = await Usuario.findOne({ 
            resetToken: token,
            resetTokenExpiry: { $gt: Date.now() }
        });
        
        if (!usuario) {
            return res.render('redefinir-senha', { error: 'Link inválido ou expirado.', token: null });
        }
        
        const novaSenhaHash = await bcrypt.hash(senha, 10);
        usuario.senha = novaSenhaHash;
        usuario.resetToken = undefined;
        usuario.resetTokenExpiry = undefined;
        await usuario.save();
        
        res.redirect('/login?success=Senha redefinida com sucesso! Faça login.');
    } catch (error) {
        console.error(error);
        res.render('redefinir-senha', { error: 'Erro ao redefinir senha.', token });
    }
});

// Logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error(err);
        }
        res.redirect('/');
    });
});

module.exports = router;