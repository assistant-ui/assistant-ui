import * as nodePath from "node:path";
import { compileGenerative, isGenerativeModule } from "./compile";
import type { Target } from "./constants";

/** This package's name, used in the facade's re-export specifier. */
const PKG = "@assistant-ui/use-generative";

/** Basenames of the react-server-conditioned indirection modules (see next.ts). */
const SERVER_INDIRECTION = "generative-server";
const CLIENT_INDIRECTION = "generative-client";

/** The subset of the webpack/Turbopack loader context this loader reads. */
export interface GenerativeLoaderContext {
  resourcePath?: string;
  resourceQuery?: string;
  sourceMap?: boolean;
  getOptions?(): { path?: string } | undefined;
  async(): (err: unknown, code?: string, map?: object | null) => void;
}

const basename = (resourcePath: string): string =>
  resourcePath.split(/[\\/]/).pop() ?? resourcePath;

/** Whether this resolution is one of the package's indirection modules. */
function indirectionVariant(resourcePath: string): Target | null {
  const base = basename(resourcePath);
  if (base.startsWith(SERVER_INDIRECTION)) return "server";
  if (base.startsWith(CLIENT_INDIRECTION)) return "client";
  return null;
}

/** The concrete build forced by a `?generative=client|server` resource query. */
function queryTarget(resourceQuery: string | undefined): Target | null {
  if (!resourceQuery) return null;
  const g = new URLSearchParams(resourceQuery.replace(/^\?/, "")).get(
    "generative",
  );
  return g === "server" || g === "client" ? g : null;
}

/** Back-compat: the concrete build target a `?generative=*` query selects. */
export function resolveTarget(context: GenerativeLoaderContext): Target {
  return queryTarget(context.resourceQuery) ?? "client";
}

/**
 * The facade emitted for a *bare* import of a generative module. It delegates
 * build selection to the package's `react-server`-conditioned `/generative`
 * subpath, passing this module's path through a Turbopack import attribute (a
 * `?path=` query can't ride a package specifier, but `with {}` can). The
 * `react-server` condition then resolves it to the server build in react-server
 * layers (RSC + route handlers) and the client build everywhere else (SSR +
 * browser) — one bare import, no query, no `imports` field, and `server-only`
 * stays confined to react-server layers (never the client/SSR graph).
 */
export function buildFacade(resourcePath: string): string {
  const options = JSON.stringify(JSON.stringify({ path: resourcePath }));
  const attr =
    `with { turbopackLoader: "${PKG}/loader", ` +
    `turbopackLoaderOptions: ${options} }`;
  return [
    `import toolkit from "${PKG}/generative" ${attr};`,
    `export default toolkit;`,
    ``,
  ].join("\n");
}

/**
 * Emitted in place of an indirection module: re-exports the concrete build of
 * the originating generative module. The `react-server` condition already chose
 * this variant; `fromPath` is the indirection module's own path and `toPath` the
 * originating module's, so the specifier is made **relative** between them —
 * Turbopack won't resolve an absolute import specifier, and a relative one is
 * correct whether the package is a workspace symlink or installed in
 * node_modules.
 */
export function buildIndirection(
  variant: Target,
  fromPath: string,
  toPath: string,
): string {
  let rel = nodePath
    .relative(nodePath.dirname(fromPath), toPath)
    .replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  const spec = JSON.stringify(`${rel}?generative=${variant}`);
  return `export { default } from ${spec};\n`;
}

/**
 * Webpack/Turbopack loader for `"use generative"` modules. Dispatch:
 *  - the package indirection modules → re-export the chosen concrete build;
 *  - a `?generative=client|server` query → compile that build;
 *  - a bare generative module → the facade;
 *  - anything else → passthrough untouched.
 */
export default function generativeLoader(
  this: GenerativeLoaderContext,
  source: string,
): void {
  const callback = this.async();
  const resourcePath = this.resourcePath ?? "";

  // 1) Package indirection, resolved via the `react-server` condition. The
  //    facade applied this loader (with `path`) through an import attribute.
  const variant = indirectionVariant(resourcePath);
  if (variant) {
    const path = this.getOptions?.()?.path;
    if (!path) {
      callback(
        new Error(
          "[use-generative] indirection module loaded without a `path` " +
            "option; it must be imported via the generated facade.",
        ),
      );
      return;
    }
    callback(null, buildIndirection(variant, resourcePath, path));
    return;
  }

  // 2) Explicit concrete-build query (used by the indirection).
  const target = queryTarget(this.resourceQuery);
  if (target) {
    if (!isGenerativeModule(source)) {
      callback(null, source);
      return;
    }
    try {
      const { code, map } = compileGenerative(source, {
        target,
        filename: resourcePath,
        sourceMaps: this.sourceMap ?? false,
      });
      callback(null, code, map);
    } catch (error) {
      callback(error);
    }
    return;
  }

  // 3) Bare import of a generative module → facade.
  if (isGenerativeModule(source)) {
    callback(null, buildFacade(resourcePath));
    return;
  }

  // 4) Not a generative module.
  callback(null, source);
}
