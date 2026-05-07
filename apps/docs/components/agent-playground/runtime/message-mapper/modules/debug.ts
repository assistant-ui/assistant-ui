export const DEBUG_MAPPING = false;

export function debugLog(label: string, ...args: unknown[]) {
  if (!DEBUG_MAPPING) return;
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[${ts}] [MAPPING] ${label}`, ...args);
}
