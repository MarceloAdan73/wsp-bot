const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, 'botwsp.db');
let db = null;

async function initDatabase() {
  const SQL = await initSqlJs();
  
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
  
  db.run("PRAGMA encoding = 'UTF-8'");
  
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  const statements = schema.split(';').filter(s => s.trim());
  
  statements.forEach(stmt => {
    if (stmt.trim()) {
      db.run(stmt);
    }
  });
  
  try {
    db.run("ALTER TABLE products ADD COLUMN category TEXT DEFAULT 'mujer'");
  } catch (e) {}
  try {
    db.run("ALTER TABLE products ADD COLUMN image_url TEXT");
  } catch (e) {}
  try {
    db.run("ALTER TABLE products ADD COLUMN status TEXT DEFAULT 'disponible'");
  } catch (e) {}
  try {
    db.run("ALTER TABLE products ADD COLUMN reserved_by TEXT");
  } catch (e) {}
  try {
    db.run("ALTER TABLE products ADD COLUMN reserved_at DATETIME");
  } catch (e) {}
  try {
    db.run("ALTER TABLE orders ADD COLUMN status TEXT DEFAULT 'reservado'");
  } catch (e) {}
  try {
    db.run("ALTER TABLE orders ADD COLUMN quantity INTEGER DEFAULT 1");
  } catch (e) {}
  
  saveDatabase();
  console.log('Base de datos inicializada correctamente');
}

function saveDatabase() {
  if (db) {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (err) {
      console.error('Error guardando BD:', err);
    }
  }
}

function queryAll(sql, params = []) {
  if (!db) return [];
  const results = [];
  
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
  } catch (e) {
    console.error('queryAll error:', e.message);
  }
  return results;
}

function queryOne(sql, params = []) {
  const results = queryAll(sql, params);
  return results[0] || null;
}

function runQuery(sql, params = []) {
  if (!db) return;
  
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) {
      stmt.bind(params);
    }
    stmt.step();
    stmt.free();
  } catch (e) {
    console.error('runQuery error:', e.message);
  }
  saveDatabase();
}

function cleanDatabase() {
  if (!db) return;
  
  const products = db.exec("SELECT rowid, name FROM products");
  if (products.length > 0 && products[0].values) {
    products[0].values.forEach(([id, name]) => {
      if (name && name.includes('\uFFFD')) {
        const cleanName = name.replace(/\uFFFD/g, '');
        db.run("UPDATE products SET name = ? WHERE rowid = ?", [cleanName, id]);
        console.log(`Corregido: ${name} -> ${cleanName}`);
      }
    });
    saveDatabase();
  }
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb, saveDatabase, cleanDatabase, queryAll, queryOne, runQuery };
