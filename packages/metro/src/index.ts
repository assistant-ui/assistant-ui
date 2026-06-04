import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

/**
 * The shape of a Metro / Expo config `withAui` accepts. Typed loosely so this
 * package needs no hard dependency on `metro` or `expo`; the input shape is
 * preserved and only `transformer.babelTransformerPath` is augmented.
 */
export type MetroConfigLike = {
  transformer?:
    | {
        babelTransformerPath?: string | undefined;
        [key: string]: unknown;
      }
    | undefined;
  [key: string]: unknown;
};

/**
 * Env var the transformer reads to delegate to the project's existing
 * (Expo / React Native) babel transformer. Metro forks its transform workers
 * after `metro.config` is evaluated, so they inherit this value.
 */
export const UPSTREAM_TRANSFORMER_ENV = "AUI_METRO_UPSTREAM_TRANSFORMER";

/**
 * Wraps a Metro (or Expo) config so assistant-ui `"use generative"` modules are
 * compiled. Such a file colocates a tool's schema, its `execute`, and its
 * `render` via {@link https://www.assistant-ui.com/docs/tools/defining-tools | defineToolkit}.
 *
 * It points Metro's `babelTransformerPath` at this package's transformer, which
 * runs the `"use generative"` compiler and then delegates to your project's
 * existing transformer. The device (client) build keeps each tool's `render`
 * and any frontend `execute`; a server build (an Expo Router `+api` route)
 * keeps a server `execute` instead.
 *
 * ```js
 * // metro.config.js
 * const { getDefaultConfig } = require("expo/metro-config");
 * const { withAui } = require("@assistant-ui/metro");
 *
 * module.exports = withAui(getDefaultConfig(__dirname));
 * ```
 *
 * Authoring is identical to the web: a `"use generative"` file whose default
 * export is `defineToolkit({ ... })`, registered with `Tools({ toolkit })`.
 */
export function withAui<T extends MetroConfigLike>(config: T): T {
  const self = require.resolve("@assistant-ui/metro/transformer");
  const upstream = config.transformer?.babelTransformerPath;

  // Guard against a double-wrap (`withAui(withAui(config))`, or a shared config
  // already wrapped): if it already points at our transformer, keep the real
  // upstream captured earlier rather than overwriting it with our own path,
  // which would make `resolveUpstream()` return this transformer and recurse.
  if (upstream && upstream !== self) {
    process.env[UPSTREAM_TRANSFORMER_ENV] = upstream;
  }

  return {
    ...config,
    transformer: {
      ...config.transformer,
      babelTransformerPath: self,
    },
  };
}
