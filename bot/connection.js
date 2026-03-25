const { makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion } = require('baileys');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const AUTH_DIR = path.join(__dirname, 'auth_info');

async function connectToWhatsApp() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    auth: state,
    version,
    browser: ['Chrome', 'Chrome', '120.0.0'],
    printQRInTerminal: false
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\n📱 ESCANEÁ ESTE QR CON TU WHATSAPP:\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
      if (shouldReconnect) {
        console.log('Conexión cerrada, reconectando...');
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      console.log('✓ Conectado a WhatsApp');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    
    const { handleIncomingMessage } = require('./handlers/real');
    
    for (const message of messages) {
      if (!message.message || message.key.fromMe) continue;

      console.log(`📩 Mensaje de ${message.key.remoteJid}: ${message.message?.conversation || message.message?.extendedTextMessage?.text}`);
      await handleIncomingMessage(sock, message);
    }
  });

  return sock;
}

module.exports = { connectToWhatsApp };