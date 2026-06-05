const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const crypto = require('crypto');

// Configuração do SendGrid
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey('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');

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

// ==================== ESQUECEU SENHA ====================
router.get('/esqueceu-senha', (req, res) => {
    res.render('esqueceu-senha', { error: req.session.error, success: req.session.success });
});

router.post('/esqueceu-senha', async (req, res) => {
    try {
        const { email } = req.body;
        
        console.log(`📧 Recuperando senha para: ${email}`);
        
        const usuario = await Usuario.findOne({ email: email.toLowerCase() });
        
        if (!usuario) {
            req.session.error = 'Email não encontrado no sistema';
            return res.redirect('/auth/esqueceu-senha');
        }
        
        // Gerar token único
        const token = crypto.randomBytes(32).toString('hex');
        usuario.resetToken = token;
        usuario.resetTokenExpiry = Date.now() + 3600000; // 1 hora
        await usuario.save();
        
        // URL de redefinição (Railway)
        const resetUrl = `https://tcc-happykids-production.up.railway.app/auth/redefinir-senha/${token}`;
        
        console.log(`🔗 Link de redefinição: ${resetUrl}`);
        
        // Enviar email via SendGrid
        const msg = {
            to: usuario.email,
            from: 'lembrarvinicius@gmail.com',
            subject: 'Redefinição de Senha - HappyKids',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
                        .header { background: #2563eb; color: white; padding: 30px; text-align: center; }
                        .content { padding: 30px; }
                        .button { display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                        .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                        .warning { color: #ef4444; font-size: 12px; margin-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🎈 HappyKids</h1>
                            <p>Recuperação de Senha</p>
                        </div>
                        <div class="content">
                            <h2>Olá, ${usuario.nome}!</h2>
                            <p>Recebemos uma solicitação para redefinir sua senha.</p>
                            <div style="text-align: center;">
                                <a href="${resetUrl}" class="button">Redefinir Senha</a>
                            </div>
                            <p>Se o botão não funcionar, copie e cole o link abaixo:</p>
                            <p style="background: #f4f4f4; padding: 10px; border-radius: 4px; word-break: break-all;">
                                ${resetUrl}
                            </p>
                            <div class="warning">
                                ⚠️ Este link é válido por apenas 1 hora.
                            </div>
                            <p style="margin-top: 20px;">Se você não solicitou esta alteração, ignore este email.</p>
                        </div>
                        <div class="footer">
                            <p>HappyKids - Locação de Brinquedos</p>
                            <p>Este é um email automático, por favor não responda.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `Olá ${usuario.nome}! Para redefinir sua senha, acesse: ${resetUrl}`
        };
        
        await sgMail.send(msg);
        
        console.log(`✅ Email enviado com sucesso para: ${usuario.email}`);
        
        req.session.success = 'Email de recuperação enviado! Verifique sua caixa de entrada ou spam.';
        res.redirect('/auth/esqueceu-senha');
        
    } catch (error) {
        console.error('❌ Erro ao enviar email:', error.response?.body || error);
        
        if (error.response?.body?.errors) {
            console.error('Detalhes:', JSON.stringify(error.response.body.errors, null, 2));
        }
        
        req.session.error = 'Erro ao enviar email de recuperação. Tente novamente.';
        res.redirect('/auth/esqueceu-senha');
    }
});

// ==================== REDEFINIR SENHA ====================
router.get('/redefinir-senha/:token', async (req, res) => {
    try {
        const usuario = await Usuario.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() }
        });
        
        if (!usuario) {
            req.session.error = 'Link inválido ou expirado. Solicite uma nova recuperação.';
            return res.redirect('/auth/esqueceu-senha');
        }
        
        res.render('redefinir-senha', { 
            token: req.params.token, 
            error: null,
            success: null
        });
    } catch (error) {
        console.error(error);
        res.redirect('/auth/esqueceu-senha');
    }
});

router.post('/redefinir-senha/:token', async (req, res) => {
    try {
        const { senha, confirmar_senha } = req.body;
        
        if (!senha || !confirmar_senha) {
            req.session.error = 'Por favor, preencha todos os campos';
            return res.redirect(`/auth/redefinir-senha/${req.params.token}`);
        }
        
        if (senha.length < 6) {
            req.session.error = 'A senha deve ter pelo menos 6 caracteres';
            return res.redirect(`/auth/redefinir-senha/${req.params.token}`);
        }
        
        if (senha !== confirmar_senha) {
            req.session.error = 'As senhas não coincidem';
            return res.redirect(`/auth/redefinir-senha/${req.params.token}`);
        }
        
        const usuario = await Usuario.findOne({
            resetToken: req.params.token,
            resetTokenExpiry: { $gt: Date.now() }
        });
        
        if (!usuario) {
            req.session.error = 'Link inválido ou expirado. Solicite uma nova recuperação.';
            return res.redirect('/auth/esqueceu-senha');
        }
        
        // Atualizar senha
        usuario.senha = bcrypt.hashSync(senha, 10);
        usuario.resetToken = undefined;
        usuario.resetTokenExpiry = undefined;
        await usuario.save();
        
        console.log(`✅ Senha redefinida com sucesso para: ${usuario.email}`);
        
        req.session.success = 'Senha redefinida com sucesso! Faça login com sua nova senha.';
        res.redirect('/auth/login');
        
    } catch (error) {
        console.error(error);
        req.session.error = 'Erro ao redefinir senha. Tente novamente.';
        res.redirect(`/auth/redefinir-senha/${req.params.token}`);
    }
});

module.exports = router;