/**
 * Minimal ambient declaration for `process` in browser packages.
 * Bundlers like webpack/vite replace `process.env.NODE_ENV` at build time.
 * This avoids pulling in the full @types/node dependency.
 */
declare const process: { env: Record<string, string | undefined> };
