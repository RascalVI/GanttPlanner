import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { windowOptions } from './windowOptions';

function createWindow(): void {
  const win = new BrowserWindow(windowOptions);
  win.once('ready-to-show', () => win.show());
  if (app.isPackaged) {
    void win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    void win.loadURL('http://127.0.0.1:5173');
  }
}

app.whenReady().then(() => {
  for (const channel of ['project:open', 'project:save', 'project:save-as', 'export:pptx', 'export:png']) {
    ipcMain.handle(channel, () => ({ ok: false, code: 'NOT_READY', message: 'Функция ещё не подключена' }));
  }
  createWindow();
});

app.on('window-all-closed', () => app.quit());
