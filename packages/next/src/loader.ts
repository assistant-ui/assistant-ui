import * as nodePath from "node:path";
import {
  compileGenerative,
  isGenerativeModule,
  type Target,
} from "@assistant-ui/x-generative-compiler";

/** This package's name, used in the facade's re-export specifier. */
const PKG = "@assistant-ui/next";

/** Basenames of the react-server-conditioned indirection modules (see with-aui.ts). */
const SERVER_INDIRECTION = "bundler-redirect.server";
const CLIENT_INDIRECTION = "bundler-redirect.client";

/** The subset of the webpack/Turbopack loader context this loader reads. */
interface GenerativeLoaderContext {
  resourcePath?: string;
  resourceQuery?: string;
  sourceMap?: boolean;
  getOptions?(): { path?: string } | undefined;
  async(): (err: unknown, code?: string, map?: object | null) => void;
}

/** Whether this resolution is one of the package's indirection modules. */
function indirectionVariant(resourcePath: string): Target | null {
  const base = nodePath.basename(resourcePath);
  if (base.startsWith(SERVER_INDIRECTION)) return "server";
  if (base.startsWith(CLIENT_INDIRECTION)) return "client";
  return null;
}

/** The concrete build forced by a `?generative-env=client|server` resource query. */
function queryTarget(resourceQuery: string | undefined): Target | null {
  if (!resourceQuery) return null;
  // URLSearchParams strips a leading "?" per spec.
  const g = new URLSearchParams(resourceQuery).get("generative-env");
  return g === "server" || g === "client" ? g : null;
}

/**
 * Facade for a bare generative import: delegates build selection to the
 * `react-server`-conditioned `/bundler-redirect` subpath, passing the module's
 * path via a Turbopack import attribute. See DESIGN.md.
 */
function buildFacade(resourcePath: string): string {
  const options = JSON.stringify(JSON.stringify({ path: resourcePath }));
  const attr =
    `with { turbopackLoader: "${PKG}/loader", ` +
    `turbopackLoaderOptions: ${options} }`;
  return [
    `import toolkit from "${PKG}/bundler-redirect" ${attr};`,
    `export default toolkit;`,
    ``,
  ].join("\n");
}

/**
 * Replaces an indirection module with a re-export of the chosen concrete build,
 * via a relative specifier (Turbopack won't resolve an absolute one). See
 * DESIGN.md.
 */
function buildIndirection(
  variant: Target,
  fromPath: string,
  toPath: string,
): string {
  let rel = nodePath
    .relative(nodePath.dirname(fromPath), toPath)
    .replace(/\\/g, "/");
  if (!rel.startsWith(".")) rel = `./${rel}`;
  const spec = JSON.stringify(`${rel}?generative-env=${variant}`);
  return `export { default } from ${spec};\n`;
}

/** Webpack/Turbopack loader for `"use generative"` modules. See DESIGN.md. */
export default function generativeLoader(
  this: GenerativeLoaderContext,
  source: string,
): void {
  const callback = this.async();
  const resourcePath = this.resourcePath ?? "";

  // 1) Package indirection (resolved via the `react-server` condition).
  const variant = indirectionVariant(resourcePath);
  if (variant) {
    const path = this.getOptions?.()?.path;
    if (!path) {
      callback(
        new Error(
          "[assistant-ui/next] indirection module loaded without a `path` " +
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
