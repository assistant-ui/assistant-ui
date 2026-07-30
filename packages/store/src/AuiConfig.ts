import type { ClientNames, ClientElement } from "./types/client";
import type { DerivedElement } from "./Derived";

export type AuiConfig = {
  [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
};

/**
 * Typed identity helper for {@link AuiProvider} configs.
 *
 * A config is plain data: it can be hoisted to module scope, created inline
 * per render, or memoized — the provider never relies on config identity.
 *
 * @example
 * ```tsx
 * const config = AuiConfig({
 *   message: Derived({
 *     source: "thread",
 *     query: { index: 0 },
 *     get: (aui) => aui.thread.message({ index: 0 }),
 *   }),
 * });
 *
 * <AuiProvider config={config}>{children}</AuiProvider>;
 * ```
 */
export const AuiConfig = (config: AuiConfig): AuiConfig => config;
