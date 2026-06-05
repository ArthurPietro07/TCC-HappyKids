const authMiddleware = {
    // Verificar se usuário está logado
    isAuthenticated: (req, res, next) => {
        if (req.session.user) {
            return next();
        }
        req.session.redirectTo = req.originalUrl;
        req.session.error = 'Faça login para continuar';
        res.redirect('/login');
    },
    
    // Verificar se é admin
    isAdmin: (req, res, next) => {
        if (req.session.user && req.session.user.tipo === 'admin') {
            return next();
        }
        req.session.error = 'Acesso negado. Área restrita para administradores';
        res.redirect('/');
    },
    
    // Verificar se é cliente
    isCliente: (req, res, next) => {
        if (req.session.user && req.session.user.tipo === 'cliente') {
            return next();
        }
        req.session.error = 'Acesso negado. Área restrita para clientes';
        res.redirect('/');
    }
};

module.exports = authMiddleware;