const STORAGE_KEY = 'codexv0frontend.activeSessionId';

export function readStoredSessionId(storage: Pick<Storage, 'getItem'> = window.localStorage): string | null {
  return storage.getItem(STORAGE_KEY);
}

export function writeStoredSessionId(
  sessionId: string,
  storage: Pick<Storage, 'setItem'> = window.localStorage,
): void {
  storage.setItem(STORAGE_KEY, sessionId);
}

export function clearStoredSessionId(storage: Pick<Storage, 'removeItem'> = window.localStorage): void {
  storage.removeItem(STORAGE_KEY);
}

export const sessionStorageKey = STORAGE_KEY;
