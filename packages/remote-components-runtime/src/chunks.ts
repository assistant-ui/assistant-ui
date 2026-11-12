/**
 * Parts of the runtime most pages never use, loaded on first use: overlays
 * (only when a page opens one) and host container emulation (only for pages
 * with `@container` rules in a host container that is not the slot).
 * Bundlers split these dynamic imports; the standalone `rc-runtime.js`
 * swaps this module for chunks-script.ts, which loads `rc-overlays.js` /
 * `rc-cq.js` next to itself.
 */
export type OverlaysModule = typeof import("./overlays.js");
export type ContainersModule = typeof import("./cq.js");

export const loadOverlays = (): Promise<OverlaysModule> =>
  import("./overlays.js");
export const loadContainers = (): Promise<ContainersModule> =>
  import("./cq.js");
