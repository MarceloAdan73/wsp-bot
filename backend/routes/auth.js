const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRY = '24h';

if (!JWT_SECRET) {
  console.error('❌ JWT_SECRET no está configurado en .env');
  process.exit(1);
}

router.post('/', (req, res) => {
  const { username, password } = req.body;
  
  const validUser = process.env.ADMIN_USER;
  const validPass = process.env.ADMIN_PASSWORD;
  
  if (!validUser || !validPass) {
    console.error('❌ ADMIN_USER o ADMIN_PASSWORD no están configurados en .env');
    return res.status(500).json({ success: false, error: 'Error de configuración del servidor' });
  }
  
  if (username === validUser && password === validPass) {
    const token = jwt.sign({ user: username, role: 'admin' }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ success: true, token, user: username });
  } else {
    res.status(401).json({ success: false, error: 'Credenciales inválidas' });
  }
});

router.post('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: 'Token no proporcionado' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded.user });
  } catch (err) {
    res.status(401).json({ valid: false, error: 'Token inválido o expirado' });
  }
});

module.exports = router;
