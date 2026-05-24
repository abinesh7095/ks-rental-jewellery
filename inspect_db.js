import { initDB } from './server/db/setup.js';

async function inspect() {
  const db = await initDB();
  
  console.log("=== TABLES IN DATABASE ===");
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';");
  if (tables.length > 0) {
    console.table(tables[0].values.map(v => ({ 'Table Name': v[0] })));
  } else {
    console.log("No tables found.");
    return;
  }

  // Inspect Products
  console.log("\n=== PRODUCTS (Sample/Total) ===");
  const totalProducts = db.exec("SELECT COUNT(*) FROM products;");
  console.log(`Total Products: ${totalProducts[0].values[0][0]}`);
  const sampleProducts = db.exec("SELECT id, name, category, rental_price, available_stock FROM products LIMIT 5;");
  if (sampleProducts.length > 0) {
    const columns = sampleProducts[0].columns;
    const rows = sampleProducts[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => { obj[col] = row[idx]; });
      return obj;
    });
    console.table(rows);
  }

  // Inspect Bills
  console.log("\n=== BILLS (Sample/Total) ===");
  const totalBills = db.exec("SELECT COUNT(*) FROM bills;");
  console.log(`Total Bills: ${totalBills[0].values[0][0]}`);
  const sampleBills = db.exec("SELECT id, invoice_no, customer_name, total, status FROM bills LIMIT 5;");
  if (sampleBills.length > 0) {
    const columns = sampleBills[0].columns;
    const rows = sampleBills[0].values.map(row => {
      const obj = {};
      columns.forEach((col, idx) => { obj[col] = row[idx]; });
      return obj;
    });
    console.table(rows);
  }
}

inspect().catch(console.error);
