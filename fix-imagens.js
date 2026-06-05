// fix-imagens.js
const mongoose = require('mongoose');
const Brinquedo = require('./models/Brinquedo');

const mongoURI = 'mongodb://admin:admin12345@ac-r1nc8qn-shard-00-00.apqdhef.mongodb.net:27017,ac-r1nc8qn-shard-00-01.apqdhef.mongodb.net:27017,ac-r1nc8qn-shard-00-02.apqdhef.mongodb.net:27017/happy_kids?ssl=true&replicaSet=atlas-k0ralv-shard-0&authSource=admin&appName=Cluster0';

async function fixImagens() {
    try {
        await mongoose.connect(mongoURI);
        console.log('Conectado ao MongoDB');
        
        const brinquedos = await Brinquedo.find({});
        console.log(`Encontrados ${brinquedos.length} brinquedos`);
        
        let atualizados = 0;
        
        for (const brinquedo of brinquedos) {
            let modificado = false;
            
            // Se não tiver imagens, adicionar imagem padrão
            if (!brinquedo.imagens || brinquedo.imagens.length === 0) {
                brinquedo.imagens = [{
                    url: '/uploads/default.jpg',
                    filename: 'default.jpg',
                    principal: true
                }];
                modificado = true;
                console.log(`Brinquedo ${brinquedo.nome}: Adicionada imagem padrão`);
            }
            
            // Verificar se tem imagem principal
            const temPrincipal = brinquedo.imagens.some(img => img.principal === true);
            if (!temPrincipal && brinquedo.imagens.length > 0) {
                brinquedo.imagens[0].principal = true;
                modificado = true;
                console.log(`Brinquedo ${brinquedo.nome}: Definida primeira imagem como principal`);
            }
            
            // Garantir que apenas uma imagem é principal
            const principais = brinquedo.imagens.filter(img => img.principal === true);
            if (principais.length > 1) {
                for (let i = 1; i < principais.length; i++) {
                    principais[i].principal = false;
                }
                modificado = true;
                console.log(`Brinquedo ${brinquedo.nome}: Corrigido múltiplas imagens principais`);
            }
            
            if (modificado) {
                await brinquedo.save();
                atualizados++;
            }
        }
        
        console.log(`Total de brinquedos atualizados: ${atualizados}`);
        console.log('Correção concluída!');
        process.exit(0);
        
    } catch (error) {
        console.error('Erro:', error);
        process.exit(1);
    }
}

fixImagens();