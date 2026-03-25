const MessageProcessor = require('../core/processor');

let processor = null;

async function handleIncomingMessage(sock, message) {
  const jid = message.key.remoteJid;
  const phone = jid.split('@')[0];

  const listResponse = message.message?.listResponseMessage;
  const buttonResponse = message.message?.buttonsResponseMessage;
  const text = message.message?.conversation || message.message?.extendedTextMessage?.text || '';
  
  let selectedText = text;
  
  if (listResponse?.title) {
    selectedText = listResponse.title;
  }
  
  if (buttonResponse?.selectedButtonId) {
    selectedText = buttonResponse.selectedButtonId;
  }

  if (!selectedText.trim()) return;

  if (!processor) {
    processor = new MessageProcessor({ 
      isTest: false, 
      sock: sock 
    });
  }

  await processor.processMessage(selectedText, jid, phone);
}

module.exports = { handleIncomingMessage };
