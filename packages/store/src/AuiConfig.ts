import type { ClientNames, ClientElement } from "./types/client";
import type { DerivedElement } from "./Derived";

declare const auiConfigBrand: unique symbol;

export type AuiConfig = AuiConfig.Input & {
  readonly [auiConfigBrand]: true;
};

export declare namespace AuiConfig {
  type Input = {
    [K in ClientNames]?: ClientElement<K> | DerivedElement<K>;
  };
}

/**
 * Builds a config for {@link AuiProvider}; the `config` prop only accepts
 * configs built with this helper.
 *
 * A config is plain data: it can be hoisted to module scope, created inline
 * per render, or memoized — the provider never relies on config identity.
 *
 * @example
 * ```tsx
 * const aui = useAui();
 * const config = AuiConfig({
 *   message: Derived({
 *     source: "thread",
 *     query: { index: 0 },
 *     get: (aui) => aui.thread.message({ index: 0 }),
 *   }),
 * });
 *
 * <AuiProvider extends={aui} config={config}>{children}</AuiProvider>;
 * ```
 */
export const AuiConfig = (config: AuiConfig.Input): AuiConfig =>
  config as AuiConfig;
