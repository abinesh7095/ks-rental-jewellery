import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { start as startServer } from '../server/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const isDev = process.env.NODE_ENV === 'development';

async function createWindow() {
  // Start the Express server
  const serverPort = await startServer();
  const port = typeof serverPort === 'number' ? serverPort : 5000;

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "KS Bridal Academy - Rental Jewellery",
    icon: path.join(__dirname, '../public/logo.jpg'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    // Wait a bit for Vite to start
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:5173');
    }, 1500);
  } else {
    // In production, the Express server serves the static frontend files
    mainWindow.loadURL(`http://localhost:${port}`);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
