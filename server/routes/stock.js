import { Router } from 'express';
import { saveDB } from '../db/setup.js';

function queryAll(db, sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) results.push(stmt.getAsObject());
  stmt.free();
  return results;
}

export default function stockRoutes(db) {
  const router = Router();

  router.get('/', (req, res) => {
    try {
      const products = queryAll(db, 'SELECT * FROM products ORDER BY name ASC');
      const summary = {
        totalProducts: products.length,
        totalStock: products.reduce((s, p) => s + p.total_stock, 0),
        availableStock: products.reduce((s, p) => s + p.available_stock, 0),
        rentedOut: products.reduce((s, p) => s + (p.total_stock - p.available_stock), 0),
        lowStock: products.filter(p => p.available_stock > 0 && p.available_stock <= 2).length,
        outOfStock: products.filter(p => p.available_stock === 0).length,
      };
      res.json({ products, summary });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/rented', (req, res) => {
    try {
      const rented = queryAll(db, `
        SELECT bi.jewellery_name, bi.quantity, bi.description, b.customer_name, b.customer_phone, b.booking_date, b.return_date, b.invoice_no
        FROM bill_items bi
        JOIN bills b ON bi.bill_id = b.id
        WHERE b.status = 'active'
        ORDER BY b.return_date ASC
      `);
      res.json(rented);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/:id', (req, res) => {
    try {
      const { total_stock, available_stock } = req.body;
      db.run('UPDATE products SET total_stock = ?, available_stock = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [total_stock, available_stock, Number(req.params.id)]);
      saveDB();
      const products = queryAll(db, 'SELECT * FROM products WHERE id = ?', [Number(req.params.id)]);
      res.json(products[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
