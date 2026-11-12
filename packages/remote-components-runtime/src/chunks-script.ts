import type { ContainersModule, OverlaysModule } from "./chunks.js";

/**
 * chunks.ts for the standalone `rc-runtime.js`: chunks are classic scripts
 * next to the runtime (`rc-overlays.js`, `rc-cq.js`) that register
 * themselves on `window.__rcChunks`. Same origin as the runtime, so a
 * `script-src` that allows the runtime allows them.
 */
const base =
  (document.currentScript as HTMLScriptElement | null)?.src || location.href;
type Chunks = { overlays?: OverlaysModule; cq?: ContainersModule };

function load<K extends keyof Chunks>(
  name: K,
): Promise<NonNullable<Chunks[K]>> {
  const g = ((window as unknown as { __rcChunks?: Chunks }).__rcChunks ??= {});
  const have = g[name];
  if (have !== undefined)
    return Promise.resolve(have as NonNullable<Chunks[K]>);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = new URL(`rc-${name}.js`, base).href;
    s.onload = () =>
      g[name]
        ? resolve(g[name] as NonNullable<Chunks[K]>)
        : reject(new Error(`rc-${name}.js did not register`));
    s.onerror = () => reject(new Error(`Could not load rc-${name}.js`));
    (document.head ?? document.documentElement).append(s);
  });
}

export const loadOverlays = (): Promise<OverlaysModule> => load("overlays");
export const loadContainers = (): Promise<ContainersModule> => load("cq");
