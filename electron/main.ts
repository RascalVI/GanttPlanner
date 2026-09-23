import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'node:path';
import { readProject, recoverProject, writeProject } from '../src/storage/projectFile';
import type { Project } from '../src/domain/types';
import { windowOptions } from './windowOptions';

function createWindow(): void {
  const win = new BrowserWindow(windowOptions);
  win.once('ready-to-show', () => win.show());
  if (app.isPackaged) {
    void win.loadFile(path.join(__dirname, '../../dist/index.html'));
  } else {
    void win.loadURL('http://127.0.0.1:5173');
  }
}

app.whenReady().then(() => {
  ipcMain.handle('project:open', async (_event, selectedPath?: string, recover = false) => {
    try {
      let file = selectedPath;
      if (!file) {
        const choice = await dialog.showOpenDialog({
          title: 'Открыть проект', properties: ['openFile'],
          filters: [{ name: 'Проект Ганта', extensions: ['ganttplan'] }],
        });
        if (choice.canceled) return { ok: false, code: 'CANCELLED', message: '' };
        file = choice.filePaths[0];
      }
      const project = recover ? await recoverProject(file) : await readProject(file);
      return { ok: true, value: { path: file, project } };
    } catch (error) {
      return { ok: false, code: 'OPEN_FAILED', message: (error as Error).message };
    }
  });
  ipcMain.handle('project:save', async (_event, file: string, project: Project) => {
    try {
      await writeProject(file, project);
      return { ok: true, value: { path: file } };
    } catch (error) {
      return { ok: false, code: 'SAVE_FAILED', message: (error as Error).message };
    }
  });
  ipcMain.handle('project:save-as', async (_event, project: Project) => {
    const choice = await dialog.showSaveDialog({
      title: 'Сохранить проект', defaultPath: 'Планы разработки.ganttplan',
      filters: [{ name: 'Проект Ганта', extensions: ['ganttplan'] }],
    });
    if (choice.canceled || !choice.filePath) return { ok: false, code: 'CANCELLED', message: '' };
    try {
      await writeProject(choice.filePath, project);
      return { ok: true, value: { path: choice.filePath } };
    } catch (error) {
      return { ok: false, code: 'SAVE_FAILED', message: (error as Error).message };
    }
  });
  for (const channel of ['export:pptx', 'export:png']) {
    ipcMain.handle(channel, () => ({ ok: false, code: 'NOT_READY', message: 'Функция ещё не подключена' }));
  }
  createWindow();
});

app.on('window-all-closed', () => app.quit());
