import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDB, getDB } from './db/setup.js';
import inventoryRoutes from './routes/inventory.js';
import billingRoutes from './routes/billing.js';
import stockRoutes from './routes/stock.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

export async function start() {
  const db = await initDB();

  app.use('/api/inventory', inventoryRoutes(db));
  app.use('/api/bills', billingRoutes(db));
  app.use('/api/stock', stockRoutes(db));

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

  // Serve static files in production
  app.use(express.static(path.join(__dirname, '../dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });

  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      resolve(PORT);
    }).on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is in use, trying ${PORT + 1}`);
        app.listen(PORT + 1, () => {
          console.log(`🚀 Server running on http://localhost:${PORT + 1}`);
          resolve(PORT + 1);
        });
      } else {
        console.error(err);
      }
    });
  });
}

// Only start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  start().catch(console.error);
}
