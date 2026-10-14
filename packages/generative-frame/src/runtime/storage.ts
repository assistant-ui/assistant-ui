import type { ClearStorageResult } from "../protocol";

const EXPIRED = "expires=Thu, 01 Jan 1970 00:00:00 GMT";

/** Clears everything this frame's origin stores in the browser. */
export async function clearFrameStorage(
  win: Window,
): Promise<ClearStorageResult> {
  const cleared: string[] = [];
  const attempt = async (kind: string, clear: () => unknown) => {
    try {
      if ((await clear()) !== false) cleared.push(kind);
    } catch {}
  };

  await attempt("localStorage", () => win.localStorage.clear());
  await attempt("sessionStorage", () => win.sessionStorage.clear());
  await attempt("indexedDB", async () => {
    const idb = win.indexedDB;
    if (typeof idb?.databases !== "function") return false;
    const databases = await idb.databases();
    await Promise.all(
      databases.map(
        ({ name }) =>
          name &&
          new Promise<void>((resolve) => {
            const request = idb.deleteDatabase(name);
            request.onsuccess =
              request.onerror =
              request.onblocked =
                () => resolve();
          }),
      ),
    );
    return true;
  });
  await attempt("cacheStorage", async () => {
    if (!win.caches) return false;
    for (const key of await win.caches.keys()) await win.caches.delete(key);
    return true;
  });
  await attempt("cookies", () => {
    for (const part of win.document.cookie.split(";")) {
      const name = part.split("=")[0]?.trim();
      if (name) win.document.cookie = `${name}=; ${EXPIRED}; path=/`;
    }
  });
  return { cleared };
}
