import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('gantt', {
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (path: string, project: unknown) => ipcRenderer.invoke('project:save', path, project),
  saveProjectAs: (project: unknown) => ipcRenderer.invoke('project:save-as', project),
  exportPptx: (scenes: unknown) => ipcRenderer.invoke('export:pptx', scenes),
  savePng: (files: unknown) => ipcRenderer.invoke('export:png', files),
});
