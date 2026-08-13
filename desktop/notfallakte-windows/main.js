const { app, BrowserWindow, shell } = require('electron');
const path = require('path');

app.setName('Meine Notfallakte');
app.setPath('userData', path.join(app.getPath('appData'), 'FSA-Notfallakte-Desktop'));

function createWindow(){
  const win = new BrowserWindow({
    width: 1440,
    height: 980,
    minWidth: 900,
    minHeight: 700,
    title: 'Meine digitale & finanzielle Notfallakte',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, 'app', 'index.html'));
  win.webContents.setWindowOpenHandler(({url})=>{
    if(/^https?:/i.test(url)) shell.openExternal(url);
    return {action:'deny'};
  });
}

app.whenReady().then(()=>{
  createWindow();
  app.on('activate',()=>{
    if(BrowserWindow.getAllWindows().length===0) createWindow();
  });
});

app.on('window-all-closed',()=>{
  if(process.platform!=='darwin') app.quit();
});
