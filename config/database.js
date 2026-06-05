const mongoose = require('mongoose');

const mongoURI = 'mongodb://admin:admin12345@ac-r1nc8qn-shard-00-00.apqdhef.mongodb.net:27017,ac-r1nc8qn-shard-00-01.apqdhef.mongodb.net:27017,ac-r1nc8qn-shard-00-02.apqdhef.mongodb.net:27017/happy_kids?ssl=true&replicaSet=atlas-k0ralv-shard-0&authSource=admin&appName=Cluster0';

const connectDB = async () => {
    try {
        await mongoose.connect(mongoURI);
        console.log('MongoDB conectado com sucesso');
        
    } catch (error) {
        console.error('Erro ao conectar ao MongoDB:', error);
        process.exit(1);
    }
};

connectDB();

module.exports = mongoose;