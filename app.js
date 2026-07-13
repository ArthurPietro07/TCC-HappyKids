const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const moment = require('moment');
require('./config/database');

dotenv.config();

const app = express();

// IMPORTANTE PARA O RENDER - Confiar no proxy
app.set('trust proxy', 1);

// Configuração de views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração da sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'happykids_secret_key_2024',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        maxAge: 3600000,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

// Middleware para mensagens flash
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.moment = moment;
    res.locals.success = req.session.success || null;
    res.locals.error = req.session.error || null;
    next();
});

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/cliente', require('./routes/cliente'));
app.use('/admin', require('./routes/admin'));

// Middleware para LIMPAR mensagens APÓS as rotas serem processadas
app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
        req.session.success = null;
        req.session.error = null;
        req.session.tempEmail = null;
        req.session.dadosTemp = null;
        originalSend.call(this, data);
    };
    next();
});

// Tratamento de erro 404
app.use((req, res) => {
    res.status(404).render('error', { 
        message: 'Página não encontrada',
        error: { status: 404 }
    });
});

module.exports = app;