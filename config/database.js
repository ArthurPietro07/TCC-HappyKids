const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(
            'mongodb://admin:admin12345@ac-r1nc8qn-shard-00-00.apqdhef.mongodb.net:27017,ac-r1nc8qn-shard-00-01.apqdhef.mongodb.net:27017,ac-r1nc8qn-shard-00-02.apqdhef.mongodb.net:27017/happy_kids?ssl=true&replicaSet=atlas-k0ralv-shard-0&authSource=admin&appName=Cluster0'
        );

        console.log(`✅ MongoDB conectado: ${conn.connection.host}`);

    } catch (error) {
        console.error('❌ Erro ao conectar MongoDB:');
        console.error(error);
        process.exit(1);
    }
};

module.exports = connectDB;