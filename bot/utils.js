function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.startsWith('549')) {
    return '54' + cleaned.slice(3);
  }
  
  if (cleaned.startsWith('+549')) {
    return cleaned.replace('+', '');
  }
  
  if (cleaned.startsWith('54') && cleaned.length > 12) {
    return cleaned;
  }
  
  if (cleaned.length === 10 && cleaned.startsWith('11')) {
    return '54' + cleaned;
  }
  
  if (cleaned.startsWith('54') && cleaned.length === 12) {
    return cleaned;
  }
  
  if (cleaned.startsWith('15') || cleaned.startsWith('11')) {
    return '54' + cleaned;
  }
  
  return cleaned;
}

function isValidPhone(phone) {
  if (!phone) return false;
  const cleaned = phone.replace(/[^\d]/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

function extractCommand(text) {
  if (!text || typeof text !== 'string') return null;
  
  const normalized = text.trim().toLowerCase();
  
  if (normalized.startsWith('/')) {
    return normalized.slice(1).split(/\s+/)[0];
  }
  
  if (normalized === 'menu') return 'menu';
  if (normalized === 'hola' || normalized === 'hi' || normalized === 'holii') return 'start';
  if (normalized === 'reset') return 'reset';
  if (normalized === 'gracias' || normalized === 'gracias!' || normalized === 'chao' || normalized === 'chau') return 'goodbye';
  
  return null;
}

function isEmptyMessage(text) {
  if (text === null || text === undefined) return true;
  if (typeof text !== 'string') return true;
  return text.trim().length === 0;
}

function normalizeMessage(text) {
  if (!text) return '';
  return text.trim().toLowerCase();
}

module.exports = {
  formatPhoneNumber,
  isValidPhone,
  extractCommand,
  isEmptyMessage,
  normalizeMessage
};