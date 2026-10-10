export type WidgetRecord = {
  title: string;
  code: string;
  /** Increments on every show or edit of this title. */
  version: number;
};

export type WidgetRegistry = {
  get(title: string): WidgetRecord | undefined;
  set(title: string, code: string): WidgetRecord;
  delete(title: string): boolean;
  list(): WidgetRecord[];
  subscribe(listener: (record: WidgetRecord) => void): () => void;
};

/** Tracks the latest code of each widget by title, so edits apply to what the user sees. */
export function createWidgetRegistry(
  initial: Iterable<{ title: string; code: string }> = [],
): WidgetRegistry {
  const records = new Map<string, WidgetRecord>();
  const listeners = new Set<(record: WidgetRecord) => void>();
  for (const { title, code } of initial) {
    records.set(title, { title, code, version: 1 });
  }
  return {
    get: (title) => records.get(title),
    set(title, code) {
      const record = {
        title,
        code,
        version: (records.get(title)?.version ?? 0) + 1,
      };
      records.set(title, record);
      for (const listener of listeners) listener(record);
      return record;
    },
    delete: (title) => records.delete(title),
    list: () => [...records.values()],
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
