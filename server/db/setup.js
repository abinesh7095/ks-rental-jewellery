import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = process.env.DB_PATH || path.join(__dirname, 'rental.db');

let db;

export async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON;');

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT DEFAULT '',
      rental_price REAL NOT NULL DEFAULT 0,
      total_stock INTEGER NOT NULL DEFAULT 0,
      available_stock INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_no TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT DEFAULT '',
      customer_address TEXT DEFAULT '',
      booking_date TEXT NOT NULL,
      return_date TEXT NOT NULL,
      total REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      advance REAL NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      advance_payment_mode TEXT DEFAULT '',
      balance_payment_mode TEXT DEFAULT '',
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Migrate existing databases: add new columns if they don't exist
  const migrateColumns = [
    "ALTER TABLE bills ADD COLUMN discount REAL NOT NULL DEFAULT 0",
    "ALTER TABLE bills ADD COLUMN advance_payment_mode TEXT DEFAULT ''",
    "ALTER TABLE bills ADD COLUMN balance_payment_mode TEXT DEFAULT ''"
  ];
  for (const sql of migrateColumns) {
    try { db.run(sql); } catch { /* column already exists */ }
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS bill_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bill_id INTEGER NOT NULL,
      product_id INTEGER,
      jewellery_name TEXT NOT NULL,
      description TEXT DEFAULT '',
      quantity INTEGER NOT NULL DEFAULT 0,
      amount REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
    )
  `);

  // Seed defaults
  const count = db.exec('SELECT COUNT(*) as count FROM products');
  if (count[0].values[0][0] === 0) {
    const defaults = [
      ['Necklace', 'Necklace', 'Traditional bridal necklace', 500, 10, 10],
      ['Haram', 'Haram', 'Long chain haram', 800, 8, 8],
      ['Hipbelt', 'Hipbelt', 'Bridal hip belt / Oddiyanam', 600, 6, 6],
      ['Vangi', 'Vangi', 'Arm vangi / Armlet', 300, 12, 12],
      ['Earing', 'Earing', 'Traditional earrings', 200, 15, 15],
      ['Tikka', 'Tikka', 'Maang tikka / Nethi chutti', 250, 10, 10],
      ['Ring', 'Ring', 'Bridal rings', 150, 20, 20],
      ['Bangle', 'Bangle', 'Gold bangles set', 400, 10, 10],
      ['Jadabilla', 'Jadabilla', 'Hair accessories / Jadabilla', 350, 8, 8],
      ['Maattai', 'Maattai', 'Ear chain / Maattai', 200, 12, 12],
    ];
    for (const d of defaults) {
      db.run('INSERT INTO products (name, category, description, rental_price, total_stock, available_stock) VALUES (?, ?, ?, ?, ?, ?)', d);
    }
    console.log('✅ Seeded default jewellery products');
  }

  saveDB();
  return db;
}

export function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function getDB() {
  return db;
}
