const { app, BrowserWindow, shell } = require('electron');
const path = require('path');
const fs = require('fs');

// MASTER: Diese Platzhalter bei jedem neuen Produkt eindeutig ersetzen.
const PRODUCT_APP_NAME = '{{PRODUCT_APP_NAME}}';
const PRODUCT_USER_DATA_DIR = '{{PRODUCT_USER_DATA_DIR}}';
const PRODUCT_WINDOW_TITLE = '{{PRODUCT_WINDOW_TITLE}}';

app.setName(PRODUCT_APP_NAME);
app.setPath('userData', path.join(app.getPath('appData'), PRODUCT_USER_DATA_DIR));

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 900,
    minHeight: 700,
    title: PRODUCT_WINDOW_TITLE,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, 'app', 'index.html'));

  win.webContents.once('did-finish-load', () => {
    const uxPath = path.join(__dirname, 'desktop-ux.js');
    if (fs.existsSync(uxPath)) {
      win.webContents.executeJavaScript(fs.readFileSync(uxPath, 'utf8')).catch(console.error);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
