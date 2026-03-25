const { initDatabase, getDb } = require('./database/db');

async function check() {
  await initDatabase();
  const db = getDb();
  
  // Buscar todos los registros de product_sizes
  console.log('=== All product_sizes ===');
  const sizes = db.exec('SELECT * FROM product_sizes WHERE product_id >= 24');
  console.log(JSON.stringify(sizes, null, 2));
  
  // Probar con string vs number
  console.log('\n=== Test with string "25" ===');
  const stmt1 = db.prepare('SELECT * FROM product_sizes WHERE product_id = ?');
  stmt1.bind(['25']);
  let r1 = [];
  while (stmt1.step()) r1.push(stmt1.getAsObject());
  stmt1.free();
  console.log('Result:', r1);
  
  console.log('\n=== Test with number 25 ===');
  const stmt2 = db.prepare('SELECT * FROM product_sizes WHERE product_id = ?');
  stmt2.bind([25]);
  let r2 = [];
  while (stmt2.step()) r2.push(stmt2.getAsObject());
  stmt2.free();
  console.log('Result:', r2);
  
  process.exit();
}

check();
