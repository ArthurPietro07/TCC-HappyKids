const express = require('express');
const session = require('express-session');
const mongoose = require('./config/database');
const path = require('path');

// Importar rotas
const authRoutes = require('./routes/auth');
const indexRoutes = require('./routes/index');
const clienteRoutes = require('./routes/cliente');
const adminRoutes = require('./routes/admin');

const app = express();

// 🔧 CORREÇÃO DE FUSO HORÁRIO - Forçar horário de Brasília
process.env.TZ = 'America/Sao_Paulo';

// Configurações
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração de sessão
const sessionConfig = {
    secret: 'happykids_secret_key_2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false
    }
};

app.use(session(sessionConfig));

// Middleware para disponibilizar usuário para todas as views
app.use((req, res, next) => {
    res.locals.usuario = req.session.usuario || null;
    next();
});

// Rotas
app.use('/', indexRoutes);
app.use('/', authRoutes);
app.use('/cliente', clienteRoutes);
app.use('/admin', adminRoutes);

// Rota 404
app.use((req, res) => {
    res.status(404).render('error', { message: 'Página não encontrada' });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
    console.error('❌ Erro global:', err);
    res.status(500).render('error', { message: 'Erro interno do servidor' });
});

module.exports = app;