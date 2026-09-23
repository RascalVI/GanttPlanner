import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { readProject, recoverProject, writeProject } from '../src/storage/projectFile';
import { writePptx } from '../src/export/pptx';
import type { Project } from '../src/domain/types';
import type { ExportScene } from '../src/export/scene';
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
    let file = selectedPath;
    try {
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
      return { ok: false, code: 'OPEN_FAILED', message: (error as Error).message, path: file };
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
  ipcMain.handle('export:pptx', async (_event, scenes: ExportScene[]) => {
    const choice = await dialog.showSaveDialog({
      title: 'Сохранить редактируемый Гант', defaultPath: 'План разработки.pptx',
      filters: [{ name: 'PowerPoint', extensions: ['pptx'] }],
    });
    if (choice.canceled || !choice.filePath) return { ok: false, code: 'CANCELLED', message: '' };
    try {
      await writePptx(scenes, choice.filePath);
      return { ok: true, value: { path: choice.filePath } };
    } catch (error) {
      return { ok: false, code: 'EXPORT_FAILED', message: (error as Error).message };
    }
  });
  ipcMain.handle('export:png', async (_event, files: { path: string; dataUrls: string[] }) => {
    try {
      const base = files.path.replace(/\.pptx$/i, '');
      const paths: string[] = [];
      for (let index = 0; index < files.dataUrls.length; index++) {
        const target = files.dataUrls.length === 1 ? `${base}.png` : `${base}-${String(index + 1).padStart(2, '0')}.png`;
        const data = files.dataUrls[index].split(',')[1];
        if (!data) throw new Error('Изображение не сформировано');
        await writeFile(target, Buffer.from(data, 'base64'));
        paths.push(target);
      }
      return { ok: true, value: { paths } };
    } catch (error) {
      return { ok: false, code: 'PNG_FAILED', message: (error as Error).message };
    }
  });
  createWindow();
});

app.on('window-all-closed', () => app.quit());
