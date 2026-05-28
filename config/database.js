const mongoose = require('mongoose');

// String de conexão direta do MongoDB Atlas
const mongoURI = 'mongodb://admin:admin12345@ac-r1nc8qn-shard-00-00.apqdhef.mongodb.net:27017,ac-r1nc8qn-shard-00-01.apqdhef.mongodb.net:27017,ac-r1nc8qn-shard-00-02.apqdhef.mongodb.net:27017/happy_kids?ssl=true&replicaSet=atlas-k0ralv-shard-0&authSource=admin&appName=Cluster0';

// Opções de conexão
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000, // 10 segundos
    socketTimeoutMS: 45000,
    family: 4, // Força IPv4
};

console.log('🔄 Tentando conectar ao MongoDB Atlas...');
console.log('📁 Banco de dados: happy_kids');

const connectDB = async () => {
    try {
        await mongoose.connect(mongoURI, options);
        console.log('✅ MongoDB conectado com sucesso!');
        console.log('📡 Cluster: atlas-k0ralv-shard-0');
    } catch (error) {
        console.error('❌ Erro ao conectar ao MongoDB:', error.message);
        console.log('🔄 Tentando reconectar em 5 segundos...');
        setTimeout(connectDB, 5000);
    }
};

// Eventos de conexão
mongoose.connection.on('connected', () => {
    console.log('📡 Mongoose conectado ao MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
    console.error('❌ Erro na conexão MongoDB:', err.message);
});

mongoose.connection.on('disconnected', () => {
    console.log('⚠️ MongoDB desconectado. Tentando reconectar...');
    setTimeout(connectDB, 5000);
});

// Iniciar conexão
connectDB();

module.exports = mongoose;