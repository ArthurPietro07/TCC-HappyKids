// Middleware para verificar se usuário está logado
function isAuthenticated(req, res, next) {
    if (req.session.usuario) {
        return next();
    }
    res.redirect('/login');
}

// Middleware para verificar se é admin
function isAdmin(req, res, next) {
    if (req.session.usuario && req.session.usuario.tipo === 'admin') {
        return next();
    }
    res.status(403).send('Acesso negado! Apenas administradores.');
}

// Middleware para verificar se é cliente
function isCliente(req, res, next) {
    if (req.session.usuario && req.session.usuario.tipo === 'cliente') {
        return next();
    }
    res.status(403).send('Acesso negado! Área exclusiva para clientes.');
}

module.exports = { isAuthenticated, isAdmin, isCliente };