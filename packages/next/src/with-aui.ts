import { createRequire } from "node:module";
import { statSync } from "node:fs";

const LOADER = "@assistant-ui/next/loader";

/**
 * A token that changes whenever the `"use generative"` compiler this loader runs
 * (`@assistant-ui/x-generative-compiler`) changes. Turbopack and webpack fold a
 * loader's `options` into its cache key, so passing this invalidates cached
 * transforms when the compiler's behavior changes — node_modules content isn't
 * otherwise watched. The package version covers published upgrades (and is
 * already part of the resolved module path); the dist mtime additionally covers
 * in-place rebuilds in a monorepo, where the version stays the same. A stale or
 * mismatched token only forces a recompile, never wrong output, so a failure to
 * resolve falls back to a constant.
 */
function compilerCacheToken(): string {
  try {
    const require = createRequire(import.meta.url);
    const entry = require.resolve("@assistant-ui/x-generative-compiler");
    return `${entry}:${statSync(entry).mtimeMs}`;
  } catch {
    return "unknown";
  }
}

/** The loader plus the cache-busting token, in the `{ loader, options }` form both bundlers accept. */
const LOADER_USE = { loader: LOADER, options: { v: compilerCacheToken() } };

/**
 * Restricts the rule to modules that carry the directive, matching the loader's
 * own detection. A glob alone also matches modules Turbopack generates, such as
 * the shim behind `new Worker(new URL(...))`, whose resource path is not on the
 * project filesystem and fails the build when a loader reads its source back.
 */
const HAS_DIRECTIVE = { content: /["']use generative["']/ };

export interface WithAuiOptions {
  /**
   * Globs scanned for the `"use generative"` directive (default: all TS/TSX).
   * Narrow it (e.g. `["*.generative.tsx"]`) to limit what passes through the loader.
   */
  rules?: string[];
}

// Loosely typed so this module doesn't need `next` as a dependency.
type NextConfigLike = {
  turbopack?: { rules?: Record<string, unknown> } | undefined;
  webpack?: ((config: any, context: any) => any) | null | undefined;
};

/**
 * Wraps a Next.js config so `"use generative"` modules are compiled per build
 * target. Detection is by directive, not filename. See DESIGN.md.
 *
 * @example
 * ```ts
 * // next.config.ts
 * import { withAui } from "@assistant-ui/next";
 * export default withAui({ ...yourConfig });
 * ```
 */
export function withAui<T extends NextConfigLike>(
  nextConfig: T = {} as T,
  options: WithAuiOptions = {},
): T {
  const globs = options.rules ?? ["*.ts", "*.tsx"];
  // Turbopack runs every rule matching a glob in order, so the `"use generative"`
  // loader rides as its own entry after the user's: theirs keeps its loaders and
  // its own condition, ours keeps a condition that would disable theirs.
  const rules: Record<string, unknown> = { ...nextConfig.turbopack?.rules };
  for (const glob of globs) {
    const existing = rules[glob];
    const ours = { condition: HAS_DIRECTIVE, loaders: [LOADER_USE] };
    rules[glob] =
      existing === undefined
        ? ours
        : [...(Array.isArray(existing) ? existing : [existing]), ours];
  }

  const userWebpack = nextConfig.webpack;

  return {
    ...nextConfig,
    turbopack: {
      ...nextConfig.turbopack,
      rules,
    },
    webpack(config: any, context: any) {
      // Turbopack-only facade; under webpack, import concrete builds explicitly
      // with `?generative-env=server` / `=client`.
      config.module.rules.push({
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: [LOADER_USE],
      });

      return userWebpack ? userWebpack(config, context) : config;
    },
  } as T;
}
