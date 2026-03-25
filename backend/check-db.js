const { initDatabase, getDb } = require('./database/db');

async function check() {
  await initDatabase();
  const db = getDb();
  
  console.log('=== Products with Test ===');
  const prods = db.exec('SELECT rowid, id, name, stock, status FROM products WHERE name LIKE "%Test%"');
  console.log(JSON.stringify(prods, null, 2));
  
  console.log('\n=== Product sizes for id=22 ===');
  const sizes = db.exec('SELECT * FROM product_sizes WHERE product_id = 22');
  console.log(JSON.stringify(sizes, null, 2));
  
  console.log('\n=== All product_sizes ===');
  const allSizes = db.exec('SELECT * FROM product_sizes');
  console.log(JSON.stringify(allSizes, null, 2));
  
  process.exit();
}

check();
