const { initDatabase, getDb } = require('./database/db');

async function check() {
  await initDatabase();
  const db = getDb();
  
  console.log('=== Product 25 ===');
  const prod = db.exec('SELECT * FROM products WHERE rowid = 25');
  console.log(JSON.stringify(prod, null, 2));
  
  console.log('\n=== Sizes for product 25 ===');
  const sizes = db.exec('SELECT * FROM product_sizes WHERE product_id = 25');
  console.log(JSON.stringify(sizes, null, 2));
  
  // Probar la consulta que usa el endpoint
  console.log('\n=== Testing queryAll simulation ===');
  const stmt = db.prepare('SELECT size, stock FROM product_sizes WHERE product_id = ?');
  stmt.bind([25]);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  console.log('Results:', results);
  
  process.exit();
}

check();
