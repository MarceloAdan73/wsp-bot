const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { getDb, saveDatabase, queryAll, queryOne, runQuery } = require('../database/db');
const eventEmitter = require('../server').eventEmitter;

function sanitizeString(str, maxLen = 500) {
  return String(str).replace(/[<>]/g, '').trim().slice(0, maxLen);
}

function sanitizeNumber(num, defaultVal = 0) {
  const parsed = parseFloat(num);
  return isNaN(parsed) ? defaultVal : parsed;
}

// Endpoint para sincronizar stock - recalcula el stock total de cada producto basándose en la suma de sus talles
router.post('/sync-stock', (req, res) => {
  try {
    const db = getDb();
    let fixed = 0;
    
    // Obtener todos los productos
    const products = queryAll('SELECT rowid, stock FROM products');
    
    products.forEach(p => {
      // Sumar stock de todos los talles
      const sizeStock = queryOne('SELECT SUM(stock) as total FROM product_sizes WHERE product_id = ?', [p.rowid]);
      const calculatedStock = sizeStock?.total || 0;
      
      // Solo actualizar si hay diferencia
      if (calculatedStock !== p.stock) {
        const newStatus = calculatedStock > 0 ? 'disponible' : 'vendido';
        runQuery('UPDATE products SET stock = ?, status = ? WHERE rowid = ?', [calculatedStock, newStatus, p.rowid]);
        fixed++;
        console.log(`Corregido producto ${p.rowid}: stock ${p.stock} -> ${calculatedStock}`);
      }
    });
    
    res.json({ message: 'Stock sincronizado', productsFixed: fixed });
  } catch (error) {
    console.error('Error syncing stock:', error);
    res.status(500).json({ error: error.message });
  }
});

// Configuración de multer para subida de imágenes
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  
  if (extname && mimetype) {
    return cb(null, true);
  }
  cb(new Error('Solo se permiten imágenes (jpg, png, webp)'));
};

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter
});

// ============================================
// RUTA PARA LISTAR PRODUCTOS (CON FILTROS)
// ============================================
router.get('/', (req, res) => {
  try {
    console.log('=== GET /products called ===');
    const { status, category } = req.query;
    console.log('Query params:', { status, category });
    
    const db = getDb();
    console.log('DB exists:', !!db);
    
    let sql = 'SELECT * FROM products';
    const params = [];

    // Aplicar filtros
    if (status === 'active') {
      sql += ' WHERE status = "disponible" AND stock > 0';
    } else if (status === 'all') {
      // No filtrar, traer todos
    } else if (status) {
      sql += ' WHERE status = ?';
      params.push(status);
    }

    if (category) {
      if (sql.includes('WHERE')) {
        sql += ' AND category = ?';
      } else {
        sql += ' WHERE category = ?';
      }
      params.push(category);
    }

    sql += ' ORDER BY rowid DESC';
    
    const products = queryAll(sql, params);
    console.log('Productos encontrados:', products.length);
    if (products.length > 0) {
      console.log('Primer producto:', JSON.stringify(products[0]));
    }
    
    // Obtener talles con stock para cada producto
    const productsWithSizes = products.map(p => {
      const productId = p.id || p.rowid;
      console.log('Buscando talles para product_id:', productId);
      const sizes = queryAll('SELECT size, stock FROM product_sizes WHERE product_id = ?', [productId]);
      console.log('Talles encontrados:', sizes.length);
      return { ...p, sizeStock: sizes };
    });
    
    res.json(productsWithSizes);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /products/:id - Obtener producto por ID
router.get('/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    console.log('GET /products/:id - id:', id);
    const products = queryAll('SELECT rowid, * FROM products WHERE rowid = ?', [id]);
    
    if (products.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const p = products[0];
    console.log('Product found:', p);
    
    const sizes = queryAll('SELECT size, stock FROM product_sizes WHERE product_id = ?', [id]);
    console.log('Sizes found:', sizes);
    
    res.json({ ...p, sizeStock: sizes });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /products/duplicate - Duplicar producto
router.post('/duplicate', (req, res) => {
  try {
    const { productId } = req.body;
    
    const product = queryAll('SELECT * FROM products WHERE rowid = ?', [productId]);
    if (!product || product.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const original = product[0];
    let newImageUrl = null;
    
    if (original.image_url) {
      const fs = require('fs');
      const path = require('path');
      const originalPath = path.join(__dirname, '..', original.image_url);
      
      if (fs.existsSync(originalPath)) {
        const ext = path.extname(original.image_url);
        const newFilename = Date.now() + '-copy' + ext;
        const newPath = path.join(__dirname, '..', 'uploads', newFilename);
        
        fs.copyFileSync(originalPath, newPath);
        newImageUrl = '/uploads/' + newFilename;
      }
    }
    
    const newName = (original.name || '').trim();
    
    runQuery(
      'INSERT INTO products (name, price, description, stock, category, sizes, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [newName, original.price, original.description || '', original.stock || 0, original.category || 'mujer', original.sizes || 'S,M,L,XL', newImageUrl, 'disponible']
    );
    
    const db = getDb();
    const maxIdResult = db.exec('SELECT MAX(rowid) as maxid FROM products');
    const newProductId = maxIdResult[0]?.values[0]?.[0];
    
    // Duplicar también el stock por talle
    const originalSizeStock = queryAll('SELECT size, stock FROM product_sizes WHERE product_id = ?', [productId]);
    if (originalSizeStock.length > 0) {
      originalSizeStock.forEach(s => {
        runQuery(
          'INSERT INTO product_sizes (product_id, size, stock) VALUES (?, ?, ?)',
          [newProductId, s.size, s.stock]
        );
      });
    }
    
    res.json({ 
      id: newProductId, 
      name: newName, 
      price: original.price, 
      description: original.description, 
      stock: original.stock, 
      category: original.category, 
      sizes: original.sizes, 
      image_url: newImageUrl, 
      status: 'disponible' 
    });
  } catch (error) {
    console.error('Error duplicating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /products - Crear producto
router.post('/', upload.single('image'), async (req, res) => {
  console.log('POST /products - body:', req.body);
  console.log('POST /products - file:', req.file);
  try {
    let { name, price, description, category, sizes, sizeStock, image_url } = req.body;
    let imageUrl = null;
    
    // Si se subió un archivo, usar esa imagen
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    } 
    // Si se envió una URL de imagen externa, guardarla directamente
    else if (image_url && (image_url.startsWith('http://') || image_url.startsWith('https://'))) {
      imageUrl = image_url;
    }
    
    const defaultSizes = 'S,M,L,XL';
    
    name = sanitizeString(name, 200);
    price = sanitizeNumber(price, 0);
    description = sanitizeString(description, 1000);
    category = sanitizeString(category, 50);
    sizes = sanitizeString(sizes, 100);
    
    if (!name) {
      return res.status(400).json({ error: 'El nombre del producto es requerido' });
    }
    
    let totalStock = 0;
    let sizeStockArray = [];
    
    if (sizeStock) {
      try {
        sizeStockArray = typeof sizeStock === 'string' ? JSON.parse(sizeStock) : sizeStock;
        totalStock = sizeStockArray.reduce((sum, s) => sum + (parseInt(s.stock) || 0), 0);
      } catch (e) {
        sizeStockArray = [];
        totalStock = 0;
      }
    }
    
    if (totalStock === 0) {
      totalStock = 1;
    }
    
    runQuery(
      'INSERT INTO products (name, price, description, stock, category, sizes, image_url, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [name, price, description || '', totalStock, category || 'mujer', sizes || defaultSizes, imageUrl, totalStock > 0 ? 'disponible' : 'reservado']
    );
    
    // Obtener el rowid del producto insertado usando MAX
    const db = getDb();
    const maxIdResult = db.exec('SELECT MAX(rowid) as maxid FROM products');
    const productRowId = maxIdResult[0]?.values[0]?.[0];
    
    console.log('Product created with rowid:', productRowId, 'sizeStock:', sizeStockArray);
    
    // Guardar stock por talle - inicializar todos los talles del string sizes
    const allSizesFromStr = (sizes || defaultSizes).split(',').map(s => s.trim().toUpperCase());
    
    // Crear mapa de stocks del sizeStockArray
    const sizeStockMap = {};
    if (sizeStockArray && sizeStockArray.length > 0) {
      sizeStockArray.forEach(s => {
        if (s.size) {
          sizeStockMap[String(s.size).toUpperCase()] = parseInt(s.stock) || 0;
        }
      });
    }
    
    // Eliminar registros existentes (por si acaso)
    runQuery('DELETE FROM product_sizes WHERE product_id = ?', [productRowId]);
    
    // Insertar todos los talles del string sizes (con stock 0 si no está en sizeStockMap)
    allSizesFromStr.forEach(sizeName => {
      const stock = sizeStockMap[sizeName] !== undefined ? sizeStockMap[sizeName] : 0;
      runQuery(
        'INSERT INTO product_sizes (product_id, size, stock) VALUES (?, ?, ?)',
        [productRowId, sizeName, stock]
      );
    });
    
    // Obtener los talles guardados
    const savedSizes = queryAll('SELECT size, stock FROM product_sizes WHERE product_id = ?', [productRowId]);
    
    res.json({ 
      id: productRowId, 
      name, 
      price, 
      description, 
      stock: totalStock, 
      category, 
      sizes: sizes || defaultSizes, 
      image_url: imageUrl, 
      status: totalStock > 0 ? 'disponible' : 'reservado',
      sizeStock: savedSizes
    });
  } catch (error) {
    console.error('Error in POST /products:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /products/:id - Obtener producto por ID
// PUT /products/:id - Actualizar producto
router.put('/:id', upload.single('image'), (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, description, category, status, sizes, sizeStock } = req.body;
    
    console.log('PUT update - req.body:', req.body);
    console.log('PUT update - sizeStock:', sizeStock);
    
    const defaultSizes = 'S,M,L,XL';

    let imageUrl = null;
    
    if (req.file) {
      const oldProduct = queryAll('SELECT image_url FROM products WHERE rowid = ?', [id]);
      if (oldProduct[0]?.image_url) {
        const oldImgPath = path.join(__dirname, '..', oldProduct[0].image_url);
        if (fs.existsSync(oldImgPath)) fs.unlinkSync(oldImgPath);
      }
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // Calcular stock total desde sizeStock
    let totalStock = 0;
    let sizeStockArray = [];
    
    if (sizeStock) {
      try {
        // El sizeStock viene como string desde FormData
        sizeStockArray = typeof sizeStock === 'string' ? JSON.parse(sizeStock) : sizeStock;
        if (Array.isArray(sizeStockArray)) {
          totalStock = sizeStockArray.reduce((sum, s) => sum + (parseInt(s.stock) || 0), 0);
        }
      } catch (e) {
        console.log('Error parsing sizeStock:', e);
        sizeStockArray = [];
        totalStock = 0;
      }
    }

    const newStatus = totalStock > 0 ? 'disponible' : 'reservado';

    // Actualizar producto
    if (imageUrl) {
      runQuery(
        'UPDATE products SET name = ?, price = ?, description = ?, stock = ?, category = ?, status = ?, sizes = ?, image_url = ? WHERE rowid = ?',
        [name, price, description || '', totalStock, category || 'mujer', status || newStatus, sizes || defaultSizes, imageUrl, id]
      );
    } else {
      runQuery(
        'UPDATE products SET name = ?, price = ?, description = ?, stock = ?, category = ?, status = ?, sizes = ? WHERE rowid = ?',
        [name, price, description || '', totalStock, category || 'mujer', status || newStatus, sizes || defaultSizes, id]
      );
    }

    // Actualizar stock por talle - inicializar todos los talles del string sizes
    const allSizesFromStr = (sizes || defaultSizes).split(',').map(s => s.trim().toUpperCase());
    
    // Crear mapa de stocks del sizeStockArray
    const sizeStockMap = {};
    if (sizeStockArray && sizeStockArray.length > 0) {
      sizeStockArray.forEach(s => {
        if (s.size) {
          sizeStockMap[String(s.size).toUpperCase()] = parseInt(s.stock) || 0;
        }
      });
    }
    
    // Eliminar talles existentes
    runQuery('DELETE FROM product_sizes WHERE product_id = ?', [id]);
    
    // Insertar todos los talles del string sizes (con stock 0 si no está en sizeStockMap)
    allSizesFromStr.forEach(sizeName => {
      const stock = sizeStockMap[sizeName] !== undefined ? sizeStockMap[sizeName] : 0;
      runQuery(
        'INSERT INTO product_sizes (product_id, size, stock) VALUES (?, ?, ?)',
        [id, sizeName, stock]
      );
    });
    
    // Recalcular stock total
    const newTotal = queryOne('SELECT SUM(stock) as total FROM product_sizes WHERE product_id = ?', [id]);
    totalStock = newTotal?.total || 0;
    runQuery('UPDATE products SET stock = ? WHERE rowid = ?', [totalStock, id]);

    res.json({ message: 'Producto actualizado' });
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /products/:id/reserve - Reservar producto
router.post('/:id/reserve', (req, res) => {
  try {
    const { id } = req.params;
    const { phone, customerName, size } = req.body;

    const product = queryAll('SELECT status, name, price, stock FROM products WHERE rowid = ?', [id]);

    if (!product || product.length === 0) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    if (product[0].stock <= 0) {
      return res.status(400).json({
        success: false,
        error: 'no_disponible',
        message: 'No hay stock disponible'
      });
    }

    // Decrementar stock del talle específico o del primer talle con stock
    let sizeUsed = size;
    if (!sizeUsed) {
      const sizeWithStock = queryOne('SELECT size FROM product_sizes WHERE product_id = ? AND stock > 0 LIMIT 1', [id]);
      sizeUsed = sizeWithStock?.size;
    }

    if (sizeUsed) {
      runQuery('UPDATE product_sizes SET stock = stock - 1 WHERE product_id = ? AND size = ?', [id, sizeUsed]);
    }

    // Recalcular stock total desde product_sizes
    const sizeStockTotal = queryOne('SELECT SUM(stock) as total FROM product_sizes WHERE product_id = ?', [id]);
    const newStock = sizeStockTotal?.total || 0;
    const newStatus = newStock > 0 ? 'disponible' : 'reservado';
    
    runQuery(
      'UPDATE products SET stock = ?, status = ?, reserved_by = ?, reserved_at = CURRENT_TIMESTAMP WHERE rowid = ?',
      [newStock, newStatus, phone, id]
    );

    eventEmitter.emit('new_reservation', {
      productId: id,
      productName: product[0].name,
      price: product[0].price,
      remainingStock: newStock,
      phone,
      customerName: customerName || 'Cliente',
      talle: sizeUsed,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Producto reservado', remainingStock: newStock, talle: sizeUsed });
  } catch (error) {
    console.error('Error reserving product:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /products/:id/sell - Marcar como vendido
router.post('/:id/sell', (req, res) => {
  try {
    const { id } = req.params;
    const product = queryAll('SELECT name, price FROM products WHERE rowid = ?', [id]);
    
    // Buscar primer talle con stock disponible y decrementarlo
    const sizeWithStock = queryOne('SELECT size FROM product_sizes WHERE product_id = ? AND stock > 0 LIMIT 1', [id]);
    
    if (sizeWithStock) {
      runQuery('UPDATE product_sizes SET stock = stock - 1 WHERE product_id = ? AND size = ?', [id, sizeWithStock.size]);
      // Recalcular stock total
      const totalStock = queryOne('SELECT SUM(stock) as total FROM product_sizes WHERE product_id = ?', [id]);
      const newTotal = totalStock?.total || 0;
      const newStatus = newTotal > 0 ? 'disponible' : 'vendido';
      runQuery('UPDATE products SET stock = ?, status = ? WHERE rowid = ?', [newTotal, newStatus, id]);
    } else {
      runQuery('UPDATE products SET status = ? WHERE rowid = ?', ['vendido', id]);
    }

    if (product.length > 0) {
      eventEmitter.emit('new_sale', {
        productId: id,
        productName: product[0].name,
        price: product[0].price,
        timestamp: new Date().toISOString()
      });
    }

    res.json({ message: 'Producto vendido', remainingStock: queryOne('SELECT stock FROM products WHERE rowid = ?', [id])?.stock || 0 });
  } catch (error) {
    console.error('Error selling product:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /products/:id/cancel-reserve - Cancelar reserva
router.post('/:id/cancel-reserve', (req, res) => {
  try {
    const { id } = req.params;
    const { size, quantity = 1 } = req.body;
    
    // Devolver stock al talle específico
    let sizeToRestore = size;
    if (!sizeToRestore) {
      const firstSize = queryOne('SELECT size FROM product_sizes WHERE product_id = ? LIMIT 1', [id]);
      sizeToRestore = firstSize?.size;
    }
    
    if (sizeToRestore) {
      runQuery('UPDATE product_sizes SET stock = stock + ? WHERE product_id = ? AND size = ?', [quantity, id, sizeToRestore]);
    }
    
    // Recalcular stock total desde la suma de talles
    const sizeStock = queryOne('SELECT SUM(stock) as total FROM product_sizes WHERE product_id = ?', [id]);
    const newTotal = sizeStock?.total || 0;
    const newStatus = newTotal > 0 ? 'disponible' : 'reservado';
    
    runQuery(
      'UPDATE products SET stock = ?, status = ?, reserved_by = NULL, reserved_at = NULL WHERE rowid = ?',
      [newTotal, newStatus, id]
    );
    
    res.json({ message: 'Reserva cancelada', newStock: newTotal, talleLiberado: sizeToRestore || null });
  } catch (error) {
    console.error('Error canceling reserve:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /products/:id - Eliminar producto
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const products = queryAll('SELECT image_url FROM products WHERE rowid = ?', [id]);
    if (products[0]?.image_url) {
      const imgPath = path.join(__dirname, '..', products[0].image_url);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }
    runQuery('DELETE FROM products WHERE rowid = ?', [id]);
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /products - Eliminar TODOS los productos
router.delete('/', (req, res) => {
  try {
    const products = queryAll('SELECT image_url FROM products', []);
    products.forEach(p => {
      if (p.image_url) {
        const imgPath = path.join(__dirname, '..', p.image_url);
        if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
      }
    });
    runQuery('DELETE FROM products', []);
    res.json({ message: 'Todos los productos eliminados' });
  } catch (error) {
    console.error('Error deleting all products:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
