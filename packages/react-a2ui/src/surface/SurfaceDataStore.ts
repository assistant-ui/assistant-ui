export class SurfaceDataStore {
  private data = new Map<string, Record<string, unknown>>();
  private listeners = new Map<string, Set<() => void>>();

  setData(surfaceId: string, path: string, value: unknown): void {
    let surfaceData = this.data.get(surfaceId);
    if (!surfaceData) {
      surfaceData = {};
      this.data.set(surfaceId, surfaceData);
    }
    surfaceData[path] = value;
    this.notifyPath(surfaceId, path);
  }

  getData(surfaceId: string, path?: string): unknown {
    const surfaceData = this.data.get(surfaceId);
    if (!surfaceData) return undefined;
    if (path === undefined) return { ...surfaceData };
    return surfaceData[path];
  }

  subscribe(surfaceId: string, path: string, listener: () => void): () => void {
    const key = `${surfaceId}:${path}`;
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
      if (set!.size === 0) {
        this.listeners.delete(key);
      }
    };
  }

  deleteSurface(surfaceId: string): void {
    this.data.delete(surfaceId);
    for (const [key, listeners] of this.listeners) {
      if (key.startsWith(`${surfaceId}:`)) {
        for (const listener of listeners) {
          listener();
        }
        this.listeners.delete(key);
      }
    }
  }

  private notifyPath(surfaceId: string, updatedPath: string): void {
    const exactKey = `${surfaceId}:${updatedPath}`;
    this.listeners.get(exactKey)?.forEach((l) => l());
    if (updatedPath !== "/") {
      this.listeners.get(`${surfaceId}:/`)?.forEach((l) => l());
    }
  }
}
