import { app, BrowserWindow } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { start as startServer } from '../server/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV === 'development';

async function waitForServer(port, retries = 20) {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(`http://localhost:${port}/api/health`);
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  return false;
}

async function createWindow() {
  const serverPort = await startServer();
  const port = typeof serverPort === 'number' ? serverPort : 5000;

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'KS Bridal Academy - Rental Jewellery',
    icon: path.join(__dirname, '../public/logo.jpg'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    await waitForServer(5173);
    mainWindow.loadURL('http://localhost:5173');
  } else {
    await waitForServer(port);
    mainWindow.loadURL(`http://localhost:${port}`);
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});