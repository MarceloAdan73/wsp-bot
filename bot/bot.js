require('dotenv').config();
const { connectToWhatsApp } = require('./connection');

async function main() {
  console.log('🔄 Conectando a WhatsApp...');
  await connectToWhatsApp();
  console.log('✅ Bot listo y esperando mensajes...');
}

main().catch(console.error);
