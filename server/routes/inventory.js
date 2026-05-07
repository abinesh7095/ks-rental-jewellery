import { Router } from 'express';
import { saveDB } from '../db/setup.js';

// Helper to run SELECT queries and return array of objects
function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

function queryOne(db, sql, params = []) {
  const results = queryAll(db, sql, params);
  return results[0] || null;
}

export default function inventoryRoutes(db) {
  const router = Router();

  router.get('/', (req, res) => {
    try {
      const { search, category } = req.query;
      let sql = 'SELECT * FROM products';
      const params = [];
      const conditions = [];
      if (search) {
        conditions.push('(name LIKE ? OR description LIKE ?)');
        params.push(`%${search}%`, `%${search}%`);
      }
      if (category) {
        conditions.push('category = ?');
        params.push(category);
      }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY id ASC';
      res.json(queryAll(db, sql, params));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/categories', (req, res) => {
    try {
      const cats = queryAll(db, 'SELECT DISTINCT category FROM products ORDER BY category');
      res.json(cats.map(c => c.category));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/', (req, res) => {
    try {
      const { name, category, description, rental_price, total_stock } = req.body;
      db.run('INSERT INTO products (name, category, description, rental_price, total_stock, available_stock) VALUES (?, ?, ?, ?, ?, ?)',
        [name, category, description || '', rental_price, total_stock, total_stock]);
      saveDB();
      const id = db.exec('SELECT last_insert_rowid()')[0].values[0][0];
      res.status(201).json(queryOne(db, 'SELECT * FROM products WHERE id = ?', [id]));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/:id', (req, res) => {
    try {
      const { name, category, description, rental_price, total_stock, available_stock } = req.body;
      db.run('UPDATE products SET name=?, category=?, description=?, rental_price=?, total_stock=?, available_stock=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
        [name, category, description || '', rental_price, total_stock, available_stock, Number(req.params.id)]);
      saveDB();
      res.json(queryOne(db, 'SELECT * FROM products WHERE id = ?', [Number(req.params.id)]));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/:id', (req, res) => {
    try {
      db.run('DELETE FROM products WHERE id = ?', [Number(req.params.id)]);
      saveDB();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
