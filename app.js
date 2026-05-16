const express = require('express');
const session = require('express-session');
const path = require('path');
const connectDB = require('./config/database');

// Importar rotas
const indexRoutes = require('./routes/index');
const authRoutes = require('./routes/auth');
const clienteRoutes = require('./routes/cliente');
const adminRoutes = require('./routes/admin');

const app = express();

// Conectar ao MongoDB
connectDB();

// Configurações
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Sessão
app.use(session({
  secret: 'happykids_secret_key_2024',
  resave: false,
  saveUninitialized: true,
  cookie: { maxAge: 3600000 } // 1 hora
}));

// Middleware para disponibilizar usuário em todas as views
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
  res.status(404).render('404', {
    title: 'Página não encontrada'
  });
});

module.exports = app;