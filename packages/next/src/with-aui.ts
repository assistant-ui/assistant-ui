const LOADER = "@assistant-ui/next/loader";

export interface WithAuiOptions {
  /**
   * Turbopack glob(s) whose files are scanned for the `"use generative"`
   * directive. Defaults to all TS/TSX. Narrow it (e.g. `["*.generative.tsx"]`) to
   * limit how many files pass through the loader.
   */
  rules?: string[];
}

// Loosely typed so this module doesn't need `next` as a dependency.
type NextConfigLike = {
  turbopack?: { rules?: Record<string, unknown> } | undefined;
  webpack?: ((config: any, context: any) => any) | null | undefined;
};

/**
 * Wraps a Next.js config so `"use generative"` modules are compiled per build:
 * the bare import yields the client build (schema + `render`), and
 * `?generative=server` yields the server build (schema + `execute`).
 *
 * Detection is by directive, not filename — files without `"use generative"` pass
 * through untouched.
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
  // A single rule per glob. The loader turns a bare generative import into a
  // facade that delegates build selection to the package's
  // `react-server`-conditioned `/generative` subpath — so no `browser` rule
  // condition is needed here. One bare import resolves to the server build in
  // react-server layers (RSC + route handlers) and the client build everywhere
  // else, with no `?generative=server` query and no package.json `imports` entry.
  const generativeRules = Object.fromEntries(
    globs.map((glob) => [glob, { loaders: [LOADER] }]),
  );

  const userWebpack = nextConfig.webpack;

  return {
    ...nextConfig,
    turbopack: {
      ...nextConfig.turbopack,
      rules: { ...nextConfig.turbopack?.rules, ...generativeRules },
    },
    webpack(config: any, context: any) {
      // Note: the facade uses Turbopack import attributes (`turbopackLoader`),
      // so the bare-import path is Turbopack-only. Under webpack, import the
      // concrete builds explicitly with `?generative=server` / `=client`.
      config.module.rules.push({
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: [LOADER],
      });
      return userWebpack ? userWebpack(config, context) : config;
    },
  } as T;
}
