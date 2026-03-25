const { initDatabase, getDb, saveDatabase } = require('./database/db');

async function fixAllStock() {
  await initDatabase();
  const db = getDb();
  
  console.log('=== Corrigiendo stock de todos los productos ===\n');
  
  // Obtener todos los productos
  const products = db.exec('SELECT rowid, id, name, stock FROM products');
  
  if (products.length === 0 || !products[0].values) {
    console.log('No hay productos');
    process.exit();
  }
  
  let fixed = 0;
  
  products[0].values.forEach(([rowid, id, name, currentStock]) => {
    // Sumar stock de todos los talles
    const sizeResult = db.exec(`SELECT SUM(stock) as total FROM product_sizes WHERE product_id = ${rowid}`);
    const calculatedStock = sizeResult[0]?.values[0]?.[0] || 0;
    
    if (calculatedStock !== currentStock) {
      const newStatus = calculatedStock > 0 ? 'disponible' : 'vendido';
      db.run(`UPDATE products SET stock = ${calculatedStock}, status = '${newStatus}' WHERE rowid = ${rowid}`);
      console.log(`✓ ${name}: stock ${currentStock} -> ${calculatedStock} (status: ${newStatus})`);
      fixed++;
    }
  });
  
  saveDatabase();
  console.log(`\n=== Total corregidos: ${fixed} ===`);
  
  // Mostrar resumen
  console.log('\n=== Resumen final ===');
  const final = db.exec('SELECT rowid, name, stock, status FROM products');
  if (final.length > 0) {
    final[0].values.forEach(([rowid, name, stock, status]) => {
      console.log(`${rowid}. ${name}: ${stock} unidades (${status})`);
    });
  }
  
  process.exit();
}

fixAllStock();
