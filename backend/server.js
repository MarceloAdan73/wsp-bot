require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDatabase, cleanDatabase } = require('./database/db');

const clients = new Set();
const eventEmitter = {
  listeners: {},
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach(client => client.write(message));
  },
  on(event, cb) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(cb);
  }
};

function broadcast(event, data) {
  eventEmitter.emit(event, data);
}

module.exports = { broadcast, eventEmitter };

const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const customersRouter = require('./routes/customers');
const testRouter = require('./routes/test');
const authRouter = require('./routes/auth');
const authMiddleware = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3001;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
  standardHeaders: true,
  legacyHeaders: false
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas solicitudes-intensive, intenta más tarde' }
});

app.use(limiter);
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const fs = require('fs');
const categoriesPath = path.join(__dirname, 'categories.json');

function getCategories() {
  if (fs.existsSync(categoriesPath)) {
    return JSON.parse(fs.readFileSync(categoriesPath, 'utf-8'));
  }
  return [
    { id: 'mujer', name: 'Mujer', icon: '👗' },
    { id: 'hombre', name: 'Hombre', icon: '👔' },
    { id: 'ninos', name: 'Niños/as', icon: '🧒' }
  ];
}

function saveCategories(categories) {
  fs.writeFileSync(categoriesPath, JSON.stringify(categories, null, 2));
}

async function startServer() {
  await initDatabase();
  cleanDatabase();

  app.use('/test', strictLimiter, testRouter);
  app.use('/auth', authRouter);
  
  app.use(authMiddleware);
  
  app.use('/products', productsRouter);
  app.use('/orders', ordersRouter);
  app.use('/customers', customersRouter);

  app.get('/categories', (req, res) => {
    res.json(getCategories());
  });

  app.post('/categories', (req, res) => {
    const { categories } = req.body;
    saveCategories(categories);
    res.json({ message: 'Categorías guardadas' });
  });

  app.get('/', (req, res) => {
    res.json({ message: 'API de BotWsp Store', status: 'running' });
  });

  app.get('/debug/db', (req, res) => {
    const { getDb } = require('./database/db');
    const db = getDb();
    try {
      const result = db.exec('SELECT rowid, * FROM products');
      const sizes = db.exec('SELECT * FROM product_sizes');
      res.json({ products: result, sizes, count: result.length > 0 ? result[0].values.length : 0 });
    } catch (e) {
      res.json({ error: e.message });
    }
  });

  app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    clients.add(res);
    console.log(`Cliente SSE conectado. Total: ${clients.size}`);

    res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);

    req.on('close', () => {
      clients.delete(res);
      console.log(`Cliente SSE desconectado. Total: ${clients.size}`);
    });
  });

  app.listen(PORT, () => {
    console.log(`Backend corriendo en http://localhost:${PORT}`);
  });
}

app.use((err, req, res, next) => {
  console.error('Error global:', err);
  res.status(500).json({ error: err.message, stack: err.stack });
});

startServer();