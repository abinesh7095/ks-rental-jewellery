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

function queryOne(db, sql, params = []) {
  const results = queryAll(db, sql, params);
  return results[0] || null;
}

export default function billingRoutes(db) {
  const router = Router();

  router.get('/next-invoice', (req, res) => {
    try {
      const last = queryOne(db, 'SELECT invoice_no FROM bills ORDER BY id DESC LIMIT 1');
      const next = last ? parseInt(last.invoice_no) + 1 : 1001;
      res.json({ invoice_no: String(next) });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/', (req, res) => {
    try {
      const { search, status, from_date, to_date } = req.query;
      let sql = 'SELECT * FROM bills';
      const params = [], conditions = [];
      if (search) {
        conditions.push('(customer_name LIKE ? OR invoice_no LIKE ? OR customer_phone LIKE ?)');
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
      }
      if (status) { conditions.push('status = ?'); params.push(status); }
      if (from_date) { conditions.push('booking_date >= ?'); params.push(from_date); }
      if (to_date) { conditions.push('booking_date <= ?'); params.push(to_date); }
      if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
      sql += ' ORDER BY id DESC';
      res.json(queryAll(db, sql, params));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get('/:id', (req, res) => {
    try {
      const bill = queryOne(db, 'SELECT * FROM bills WHERE id = ?', [Number(req.params.id)]);
      if (!bill) return res.status(404).json({ error: 'Bill not found' });
      const items = queryAll(db, 'SELECT * FROM bill_items WHERE bill_id = ?', [Number(req.params.id)]);
      res.json({ ...bill, items });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/', (req, res) => {
    try {
      const {
        invoice_no, customer_name, customer_phone, customer_address,
        booking_date, return_date, total, discount, advance, balance,
        advance_payment_mode, balance_payment_mode, items
      } = req.body;

      db.run(
        `INSERT INTO bills (invoice_no, customer_name, customer_phone, customer_address, booking_date, return_date, total, discount, advance, balance, advance_payment_mode, balance_payment_mode)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          invoice_no, customer_name, customer_phone || '', customer_address || '',
          booking_date, return_date, total, discount || 0, advance, balance,
          advance_payment_mode || '', balance_payment_mode || ''
        ]
      );
      const billId = db.exec('SELECT last_insert_rowid()')[0].values[0][0];

      for (const item of items) {
        if (item.quantity > 0) {
          db.run('INSERT INTO bill_items (bill_id, product_id, jewellery_name, description, quantity, amount) VALUES (?, ?, ?, ?, ?, ?)',
            [billId, item.product_id || null, item.jewellery_name, item.description || '', item.quantity, item.amount]);
          if (item.product_id) {
            db.run('UPDATE products SET available_stock = MAX(available_stock - ?, 0) WHERE id = ?', [item.quantity, item.product_id]);
          }
        }
      }
      saveDB();

      const bill = queryOne(db, 'SELECT * FROM bills WHERE id = ?', [billId]);
      const billItems = queryAll(db, 'SELECT * FROM bill_items WHERE bill_id = ?', [billId]);
      res.status(201).json({ ...bill, items: billItems });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Full bill update (re-edit)
  router.put('/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      // Check this isn't hitting the /status sub-route
      if (req.params.id === 'status') return;

      const {
        invoice_no, customer_name, customer_phone, customer_address,
        booking_date, return_date, total, discount, advance, balance,
        advance_payment_mode, balance_payment_mode, items
      } = req.body;

      const existingBill = queryOne(db, 'SELECT * FROM bills WHERE id = ?', [id]);
      if (!existingBill) return res.status(404).json({ error: 'Bill not found' });

      // Restore old stock from previous items
      const oldItems = queryAll(db, 'SELECT * FROM bill_items WHERE bill_id = ?', [id]);
      for (const item of oldItems) {
        if (item.product_id) {
          db.run('UPDATE products SET available_stock = MIN(available_stock + ?, total_stock) WHERE id = ?', [item.quantity, item.product_id]);
        }
      }

      // Update bill fields
      db.run(
        `UPDATE bills SET invoice_no=?, customer_name=?, customer_phone=?, customer_address=?,
         booking_date=?, return_date=?, total=?, discount=?, advance=?, balance=?,
         advance_payment_mode=?, balance_payment_mode=? WHERE id=?`,
        [
          invoice_no, customer_name, customer_phone || '', customer_address || '',
          booking_date, return_date, total, discount || 0, advance, balance,
          advance_payment_mode || '', balance_payment_mode || '', id
        ]
      );

      // Delete old items and insert new ones
      db.run('DELETE FROM bill_items WHERE bill_id = ?', [id]);
      for (const item of items) {
        if (item.quantity > 0) {
          db.run('INSERT INTO bill_items (bill_id, product_id, jewellery_name, description, quantity, amount) VALUES (?, ?, ?, ?, ?, ?)',
            [id, item.product_id || null, item.jewellery_name, item.description || '', item.quantity, item.amount]);
          if (item.product_id) {
            db.run('UPDATE products SET available_stock = MAX(available_stock - ?, 0) WHERE id = ?', [item.quantity, item.product_id]);
          }
        }
      }
      saveDB();

      const updatedBill = queryOne(db, 'SELECT * FROM bills WHERE id = ?', [id]);
      const updatedItems = queryAll(db, 'SELECT * FROM bill_items WHERE bill_id = ?', [id]);
      res.json({ ...updatedBill, items: updatedItems });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.put('/:id/status', (req, res) => {
    try {
      const { status } = req.body;
      const id = Number(req.params.id);
      if (status === 'returned') {
        const items = queryAll(db, 'SELECT * FROM bill_items WHERE bill_id = ?', [id]);
        for (const item of items) {
          if (item.product_id) {
            db.run('UPDATE products SET available_stock = MIN(available_stock + ?, total_stock) WHERE id = ?', [item.quantity, item.product_id]);
          }
        }
      }
      db.run('UPDATE bills SET status = ? WHERE id = ?', [status, id]);
      saveDB();
      res.json(queryOne(db, 'SELECT * FROM bills WHERE id = ?', [id]));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/:id', (req, res) => {
    try {
      const id = Number(req.params.id);
      const bill = queryOne(db, 'SELECT * FROM bills WHERE id = ?', [id]);
      const items = queryAll(db, 'SELECT * FROM bill_items WHERE bill_id = ?', [id]);
      if (bill && bill.status === 'active') {
        for (const item of items) {
          if (item.product_id) {
            db.run('UPDATE products SET available_stock = MIN(available_stock + ?, total_stock) WHERE id = ?', [item.quantity, item.product_id]);
          }
        }
      }
      db.run('DELETE FROM bill_items WHERE bill_id = ?', [id]);
      db.run('DELETE FROM bills WHERE id = ?', [id]);
      saveDB();
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
