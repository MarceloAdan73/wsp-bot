const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'botwsp-secret-key-change-in-production';

function authMiddleware(req, res, next) {
  const publicPaths = ['/auth', '/events', '/categories', '/'];
  const fullPath = req.path;
  
  if (publicPaths.includes(fullPath)) {
    return next();
  }
  
  const isPublicGet = req.method === 'GET' && (fullPath.startsWith('/products') || fullPath.startsWith('/orders'));
  const isBotEndpoint = fullPath.startsWith('/orders/bot');
  
  if (isPublicGet || isBotEndpoint) {
    return next();
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Autenticación requerida' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

module.exports = authMiddleware;