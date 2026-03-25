const express = require('express');
const router = express.Router();
const { queryAll, queryOne, runQuery } = require('../database/db');
const eventEmitter = require('../server').eventEmitter;

function sanitizePhone(phone) {
  if (!phone) return '';
  const cleaned = String(phone).replace(/\D/g, '');
  return cleaned.slice(0, 20);
}

function sanitizeName(name) {
  return String(name).replace(/[<>\"']/g, '').trim().slice(0, 100);
}

function sanitizeString(str, maxLen = 500) {
  return String(str).replace(/[<>]/g, '').trim().slice(0, maxLen);
}

router.get('/', (req, res) => {
  try {
    const orders = queryAll(`
      SELECT o.*, p.name as product_name, p.price as product_price
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.rowid
      ORDER BY o.created_at DESC
    `);
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint para el bot (sin autenticación)
router.post('/bot', (req, res) => {
  try {
    let { product_id, size, customer_name, customer_phone, quantity = 1, status = 'reservado' } = req.body;

    console.log('=== /orders/bot recibido ===');
    console.log('product_id:', product_id);
    console.log('size:', size);
    console.log('customer_name:', customer_name);
    console.log('quantity:', quantity);
    console.log('=========================');

    if (!product_id || !size || !customer_name) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    product_id = parseInt(product_id);
    if (isNaN(product_id) || product_id <= 0) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    customer_name = sanitizeName(customer_name);
    if (customer_name.length < 1) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    size = sanitizeString(size, 10).toUpperCase();
    if (size.length === 0) {
      return res.status(400).json({ error: 'Talle requerido' });
    }

    quantity = parseInt(quantity) || 1;
    if (quantity < 1) quantity = 1;
    if (quantity > 10) quantity = 10;

    // Verificar stock del talle específico
    let sizeStock = null;
    try {
      sizeStock = queryOne('SELECT stock FROM product_sizes WHERE product_id = ? AND size = ?', [product_id, size]);
    } catch (e) {
      console.error('Error verificando stock:', e.message);
    }
    
    if (sizeStock === null) {
      return res.status(400).json({ success: false, error: 'no_disponible', message: `No hay registro de stock para el talle ${size}` });
    }
    
    if (sizeStock.stock < quantity) {
      return res.status(400).json({ 
        success: false, 
        error: 'no_disponible', 
        message: `Solo hay ${sizeStock.stock} unidad${sizeStock.stock > 1 ? 'es' : ''} disponible${sizeStock.stock > 1 ? 's' : ''} del talle ${size}` 
      });
    }

    // Decrementar stock del talle específico por la cantidad solicitada
    const newSizeStock = sizeStock.stock - quantity;
    runQuery('UPDATE product_sizes SET stock = ? WHERE product_id = ? AND size = ?', [newSizeStock, product_id, size]);
    
    // Recalcular stock total del producto
    const allSizeStock = queryAll('SELECT SUM(stock) as total FROM product_sizes WHERE product_id = ?', [product_id]);
    const totalStock = allSizeStock[0]?.total || 0;
    const newStatus = totalStock > 0 ? 'disponible' : 'reservado';
    
    runQuery('UPDATE products SET stock = ?, status = ? WHERE rowid = ?', [totalStock, newStatus, product_id]);

    // Insertar pedido (phone es el que viene de WhatsApp)
    runQuery(
      'INSERT INTO orders (product_id, size, customer_name, customer_phone, quantity, status) VALUES (?, ?, ?, ?, ?, ?)',
      [product_id, size, customer_name, customer_phone || '', quantity, status]
    );
    
    const result = queryAll('SELECT last_insert_rowid() as id')[0];

    // Obtener info del producto para el broadcast
    const product = queryOne('SELECT name, price FROM products WHERE rowid = ?', [product_id]);

    eventEmitter.emit('new_order', {
      orderId: result.id,
      productName: product?.name,
      productPrice: product?.price,
      size: size,
      quantity: quantity,
      customerName: customer_name,
      customerPhone: customer_phone,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      success: true,
      id: result.id, 
      product_id, 
      size, 
      quantity,
      customer_name, 
      customer_phone, 
      status,
      product_name: product?.name,
      product_price: product?.price
    });
  } catch (error) {
    console.error('Error en /orders/bot:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/debug/stock', (req, res) => {
  try {
    const products = queryAll('SELECT rowid, name, stock FROM products ORDER BY rowid');
    const debug = products.map(p => {
      const sizes = queryAll('SELECT size, stock FROM product_sizes WHERE product_id = ?', [p.rowid]);
      const calcTotal = sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
      return {
        id: p.rowid,
        name: p.name,
        stock_products: p.stock,
        stock_calculated: calcTotal,
        sizes: sizes,
        mismatch: p.stock !== calcTotal
      };
    });
    res.json({
      products: debug,
      totalProducts: products.length,
      mismatches: debug.filter(p => p.mismatch).length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/fix-stock', (req, res) => {
  try {
    const products = queryAll('SELECT rowid FROM products');
    let fixed = 0;
    
    products.forEach(p => {
      const sizes = queryAll('SELECT SUM(stock) as total FROM product_sizes WHERE product_id = ?', [p.rowid]);
      const calculatedStock = sizes[0]?.total || 0;
      
      if (p.stock !== calculatedStock) {
        runQuery('UPDATE products SET stock = ? WHERE rowid = ?', [calculatedStock, p.rowid]);
        fixed++;
        console.log(`Corregido producto ${p.rowid}: ${p.stock} -> ${calculatedStock}`);
      }
    });
    
    res.json({ message: 'Stock corregido', fixed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', (req, res) => {
  try {
    let { product_id, size, customer_name, customer_phone, status = 'reservado' } = req.body;

    if (!product_id || !size || !customer_name || !customer_phone) {
      return res.status(400).json({ error: 'Faltan campos requeridos: product_id, size, customer_name, customer_phone' });
    }

    product_id = parseInt(product_id);
    if (isNaN(product_id) || product_id <= 0) {
      return res.status(400).json({ error: 'ID de producto inválido' });
    }

    customer_name = sanitizeName(customer_name);
    if (customer_name.length < 1) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }

    customer_phone = sanitizePhone(customer_phone);
    if (customer_phone.length < 8) {
      return res.status(400).json({ error: 'Número de teléfono inválido' });
    }

    size = sanitizeString(size, 10).toUpperCase();
    if (size.length === 0) {
      return res.status(400).json({ error: 'Talle requerido' });
    }

    // Verificar stock del talle específico
    let sizeStock = null;
    try {
      sizeStock = queryOne('SELECT stock FROM product_sizes WHERE product_id = ? AND size = ?', [product_id, size.toUpperCase()]);
    } catch (e) {
      console.error('Error verificando stock:', e.message);
    }
    
    if (sizeStock === null) {
      return res.status(400).json({ success: false, error: 'no_disponible', message: `No hay registro de stock para el talle ${size}` });
    }
    
    if (sizeStock.stock <= 0) {
      return res.status(400).json({ success: false, error: 'no_disponible', message: `No hay stock disponible para el talle ${size}` });
    }

    // Decrementar stock del talle específico
    const newSizeStock = sizeStock.stock - 1;
    runQuery('UPDATE product_sizes SET stock = ? WHERE product_id = ? AND size = ?', [newSizeStock, product_id, size.toUpperCase()]);
    
    // Recalcular stock total del producto desde product_sizes
    const allSizeStock = queryAll('SELECT SUM(stock) as total FROM product_sizes WHERE product_id = ?', [product_id]);
    const totalStock = allSizeStock[0]?.total || 0;
    const newStatus = totalStock > 0 ? 'disponible' : 'reservado';
    
    runQuery('UPDATE products SET stock = ?, status = ? WHERE rowid = ?', [totalStock, newStatus, product_id]);
    
    console.log(`Reserva: producto ${product_id}, talle ${size} - Stock talle: ${sizeStock.stock} -> ${newSizeStock}, Stock total: ${totalStock}`);

    // Insertar pedido
    runQuery(
      'INSERT INTO orders (product_id, size, customer_name, customer_phone, status) VALUES (?, ?, ?, ?, ?)',
      [product_id, size, customer_name, customer_phone, status]
    );
    
    const result = queryAll('SELECT last_insert_rowid() as id')[0];

    // Obtener info del producto para el evento
    const product = queryOne('SELECT name, price FROM products WHERE rowid = ?', [product_id]);

    eventEmitter.emit('new_order', {
      orderId: result.id,
      productName: product?.name,
      productPrice: product?.price,
      size: size,
      quantity: 1,
      customerName: customer_name,
      customerPhone: customer_phone,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      id: result.id, 
      product_id, 
      size, 
      customer_name, 
      customer_phone, 
      status,
      product_name: product?.name,
      product_price: product?.price
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const order = queryOne(`
      SELECT o.*, p.name as product_name, p.price as product_price, p.description as product_description
      FROM orders o
      LEFT JOIN products p ON o.product_id = p.rowid
      WHERE o.id = ?
    `, [id]);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/', (req, res) => {
  try {
    runQuery('DELETE FROM orders');
    runQuery('DELETE FROM customers');
    res.json({ message: 'Todos los pedidos y clientes eliminados' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    runQuery('DELETE FROM orders WHERE id = ?', [id]);
    res.json({ message: 'Pedido eliminado' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/status', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['reservado', 'vendido', 'cancelado'].includes(status)) {
      return res.status(400).json({ error: 'Status no válido' });
    }

    const order = queryOne('SELECT product_id, size, quantity FROM orders WHERE id = ?', [id]);
    
    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' });
    }

    runQuery('UPDATE orders SET status = ? WHERE id = ?', [status, id]);

    if (status === 'vendido') {
      // Decrementar stock del talle reservado
      const quantity = order.quantity || 1;
      if (order.size) {
        runQuery('UPDATE product_sizes SET stock = stock - ? WHERE product_id = ? AND size = ?', [quantity, order.product_id, order.size.toUpperCase()]);
      }
      
      // Recalcular stock total
      const sizeStock = queryOne('SELECT SUM(stock) as total FROM product_sizes WHERE product_id = ?', [order.product_id]);
      const newTotal = sizeStock?.total || 0;
      
      // Solo marcar como vendido si NO queda stock
      const newStatus = newTotal > 0 ? 'disponible' : 'vendido';
      
      runQuery('UPDATE products SET stock = ?, status = ? WHERE rowid = ?', [newTotal, newStatus, order.product_id]);
    } else if (status === 'cancelado') {
      // Devolver stock al talle específico
      const quantity = order.quantity || 1;
      if (order.size) {
        runQuery('UPDATE product_sizes SET stock = stock + ? WHERE product_id = ? AND size = ?', [quantity, order.product_id, order.size.toUpperCase()]);
      }
      
      // Recalcular stock total
      const sizeStock = queryOne('SELECT SUM(stock) as total FROM product_sizes WHERE product_id = ?', [order.product_id]);
      const newTotal = sizeStock?.total || 0;
      const newStatus = newTotal > 0 ? 'disponible' : 'reservado';
      
      runQuery('UPDATE products SET stock = ?, status = ?, reserved_by = NULL, reserved_at = NULL WHERE rowid = ?', [newTotal, newStatus, order.product_id]);
    }

    res.json({ message: 'Estado actualizado' });
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
