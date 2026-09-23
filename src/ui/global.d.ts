export {};

type BridgeResult<T> = { ok: true; value: T } | { ok: false; code: string; message: string };

declare global {
  interface Window {
    gantt: {
      openProject(path?: string, recover?: boolean): Promise<BridgeResult<{ path: string; project: unknown }>>;
      saveProject(path: string, project: unknown): Promise<BridgeResult<{ path: string }>>;
      saveProjectAs(project: unknown): Promise<BridgeResult<{ path: string }>>;
      exportPptx(scenes: unknown): Promise<BridgeResult<{ path: string }>>;
      savePng(files: unknown): Promise<BridgeResult<{ paths: string[] }>>;
    };
  }
}
