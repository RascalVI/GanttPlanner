import { contextBridge, ipcRenderer, webFrame } from 'electron';

contextBridge.exposeInMainWorld('gantt', {
  openProject: (path?: string, recover?: boolean) => ipcRenderer.invoke('project:open', path, recover),
  saveProject: (path: string, project: unknown) => ipcRenderer.invoke('project:save', path, project),
  saveProjectAs: (project: unknown) => ipcRenderer.invoke('project:save-as', project),
  exportPptx: (scenes: unknown) => ipcRenderer.invoke('export:pptx', scenes),
  savePng: (files: unknown) => ipcRenderer.invoke('export:png', files),
  setZoomFactor: (factor: number) => webFrame.setZoomFactor(factor),
});
