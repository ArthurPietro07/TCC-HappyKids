const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const mongoDB = "mongodb+srv://lembrarvini:LembrarVini12345678@cluster0.apqdhef.mongodb.net/happy_kids?retryWrites=true&w=majority";

const UsuarioSchema = new mongoose.Schema({
    nome: String,
    email: String,
    senha: String,
    telefone: String,
    tipo: String,
    data_cadastro: { type: Date, default: Date.now }
});

const Usuario = mongoose.model('Usuario', UsuarioSchema);

async function createAdmin() {
    try {
        await mongoose.connect(mongoDB);
        console.log('✅ Conectado ao MongoDB');
        
        // Verificar se já existe
        const existe = await Usuario.findOne({ email: 'admin@happykids.com' });
        
        if (existe) {
            console.log('⚠️ Admin já existe!');
            console.log('Email: admin@happykids.com');
            console.log('Senha: 123456');
            process.exit(0);
        }
        
        // Criar hash da senha 123456
        const senhaHash = await bcrypt.hash('123456', 10);
        
        const admin = new Usuario({
            nome: 'Administrador',
            email: 'admin@happykids.com',
            senha: senhaHash,
            telefone: '(11) 99999-9999',
            tipo: 'admin'
        });
        
        await admin.save();
        console.log('✅ Admin criado com sucesso!');
        console.log('📧 Email: admin@happykids.com');
        console.log('🔑 Senha: 123456');
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await mongoose.disconnect();
    }
}

createAdmin();