const express = require('express');
const session = require('express-session');
const path = require('path');
const dotenv = require('dotenv');
const moment = require('moment');
require('./config/database');

dotenv.config();

const app = express();

// Configuração de views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuração da sessão
app.use(session({
    secret: 'happykids_secret_key_2024',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3600000 } // 1 hora
}));

// Variáveis globais para templates
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.moment = moment;
    next();
});

// Rotas
app.use('/', require('./routes/index'));
app.use('/auth', require('./routes/auth'));
app.use('/cliente', require('./routes/cliente'));
app.use('/admin', require('./routes/admin'));

// Tratamento de erro 404
app.use((req, res) => {
    res.status(404).render('error', { 
        message: 'Página não encontrada',
        error: { status: 404 }
    });
});

module.exports = app;