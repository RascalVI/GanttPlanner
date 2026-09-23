import type { Project } from '../domain/types';
import type { ExportScene } from '../export/scene';

type BridgeResult<T> = { ok: true; value: T } | { ok: false; code: string; message: string; path?: string };

declare global {
  interface Window {
    gantt: {
      openProject(path?: string, recover?: boolean): Promise<BridgeResult<{ path: string; project: Project }>>;
      saveProject(path: string, project: Project): Promise<BridgeResult<{ path: string }>>;
      saveProjectAs(project: Project): Promise<BridgeResult<{ path: string }>>;
      exportPptx(scenes: ExportScene[]): Promise<BridgeResult<{ path: string }>>;
      savePng(files: { path: string; dataUrls: string[] }): Promise<BridgeResult<{ paths: string[] }>>;
    };
  }
}
