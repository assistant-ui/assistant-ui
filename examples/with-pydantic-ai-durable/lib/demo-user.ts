/** The header the example server reads as the thread owner (`server/main.py`). */
export const DEMO_USER_HEADER = "x-demo-user";

const STORAGE_KEY = "durable-demo-user";

let fallback: string | undefined;

/**
 * A random id for this browser, kept in localStorage, that the example sends
 * as its user so each browser sees only its own threads. A real app sends its
 * signed-in user's credentials instead.
 */
export const demoUserId = () => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) return stored;
    const id = crypto.randomUUID();
    window.localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Storage can be blocked; the id then lasts until the tab reloads.
    fallback ??= crypto.randomUUID();
    return fallback;
  }
};

export const demoUserHeaders = () => ({ [DEMO_USER_HEADER]: demoUserId() });
