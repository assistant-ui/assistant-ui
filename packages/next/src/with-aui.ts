const LOADER = "@assistant-ui/next/loader";

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
  // Merge into the user's rules: if a glob already has a `{ loaders }` rule,
  // append ours rather than clobbering it (see DESIGN.md).
  const rules: Record<string, unknown> = { ...nextConfig.turbopack?.rules };
  for (const glob of globs) {
    const existing = rules[glob];
    const existingLoaders =
      existing &&
      typeof existing === "object" &&
      Array.isArray((existing as { loaders?: unknown }).loaders)
        ? (existing as { loaders: unknown[] }).loaders
        : [];
    rules[glob] = {
      ...(existing as object),
      loaders: [...existingLoaders, LOADER],
    };
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
        use: [LOADER],
      });
      return userWebpack ? userWebpack(config, context) : config;
    },
  } as T;
}
