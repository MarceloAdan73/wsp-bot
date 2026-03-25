const { initDatabase, getDb, saveDatabase } = require('./database/db');

async function rebuildSizes() {
  await initDatabase();
  const db = getDb();
  
  console.log('=== Regenerando tabla product_sizes ===\n');
  
  // 1. Limpiar product_sizes
  db.run('DELETE FROM product_sizes');
  
  // 2. Obtener todos los productos
  const products = db.exec('SELECT rowid, id, name, sizes, stock FROM products');
  
  if (products.length === 0 || !products[0].values) {
    console.log('No hay productos');
    process.exit();
  }
  
  let totalSizes = 0;
  
  products[0].values.forEach(([rowid, id, name, sizesStr, stock]) => {
    if (!sizesStr) return;
    
    const sizes = sizesStr.split(',').map(s => s.trim()).filter(s => s);
    
    if (sizes.length === 0) return;
    
    // Repartir stock equitativamente entre talles
    const basePerSize = Math.floor(stock / sizes.length);
    let remainder = stock % sizes.length;
    
    sizes.forEach((size, index) => {
      // Las primeras tallas reciben +1 si hay resto
      let sizeStock = basePerSize + (index < remainder ? 1 : 0);
      if (sizeStock < 0) sizeStock = 0;
      
      db.run(`INSERT INTO product_sizes (product_id, size, stock) VALUES (${rowid}, '${size.toUpperCase()}', ${sizeStock})`);
      totalSizes++;
    });
    
    console.log(`✓ ${name}: ${stock} unidades en ${sizes.length} talles`);
  });
  
  saveDatabase();
  console.log(`\n=== Total talles creados: ${totalSizes} ===`);
  
  // Verificar
  console.log('\n=== Verificación ===');
  const test = db.exec('SELECT rowid, name, stock FROM products WHERE rowid = 22');
  if (test.length > 0) {
    console.log('Producto Test Dashboard:', test[0].values);
  }
  const testSizes = db.exec('SELECT * FROM product_sizes WHERE product_id = 22');
  if (testSizes.length > 0) {
    console.log('Talles:', testSizes[0].values);
  }
  
  process.exit();
}

rebuildSizes();
