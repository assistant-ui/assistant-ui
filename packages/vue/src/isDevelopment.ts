// Vite replaces the import.meta.env and process.env.NODE_ENV literals per
// host; the try blocks cover hosts where neither binding exists.
export const isDevelopment = (() => {
  try {
    const env = (import.meta as { env?: { DEV?: boolean } }).env;
    if (typeof env?.DEV === "boolean") return env.DEV;
  } catch {
    /* empty */
  }
  try {
    return (
      process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
    );
  } catch {
    return false;
  }
})();
