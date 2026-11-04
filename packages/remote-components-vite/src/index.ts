import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Plugin, ResolvedConfig, ViteDevServer } from "vite";
import {
  connectSrc,
  frameAncestorsDirective,
  remoteComponentsMiddleware,
  RUNTIME_DIR,
  RUNTIME_FILES,
  type NetworkPolicy,
} from "@assistant-ui/remote-components-serve/node";

/**
 * Optional. A remote component is any HTML page with the runtime in it, so
 * a plain Vite app needs nothing but the `rc-runtime.js` tag. This plugin
 * adds conveniences:
 *
 *   - adds the runtime tag to your `index.html` and serves/emits
 *     `rc-runtime.js` and its chunks next to it;
 *   - `components`: turns files whose default export is a React component
 *     into pages (`/<name>/`), each a plain React app that renders the
 *     component with `useProps()`;
 *   - `singleFile`: also writes `/<name>/single.html` with everything
 *     inlined (for hosts that deliver the document themselves: Safe
 *     Content Frame, the `html` prop);
 *   - headers: CSP for the network policy, `frame-ancestors` (which host
 *     pages may embed the remotes).
 *
 * Code that imports `@assistant-ui/remote-components-runtime` (or the React hooks) uses
 * the tag's `window.rc` instead of bundling a second copy.
 */
export interface RemoteComponentsOptions {
  /**
   * Components to turn into pages. A directory (every `*.tsx` / `*.jsx`
   * file becomes `/<file name>/`) or a map of name → file. Default: none.
   */
  components?: string | Record<string, string>;
  /** `frame-ancestors` (dev server header and `_headers` on build). Default: any page may embed. */
  frameAncestors?: readonly string[];
  /** Network policy for the CSP (SPEC §12). Default "public". */
  network?: NetworkPolicy;
  /** Extra HTML for every generated page's <head>. */
  head?: string;
  /** Also produce `/<name>/single.html`. `plugins` are used for that build (e.g. `[react()]`). */
  singleFile?: { plugins?: import("vite").PluginOption[] };
  /** Add the runtime tag to the app's own `index.html` too. Default true. */
  injectIndex?: boolean;
}

const ENTRY_PREFIX = "virtual:rc-entry:";
const RESOLVED_PREFIX = "\0" + ENTRY_PREFIX;
const RUNTIME_SHIM = "\0rc-runtime-shim";
const NAME_RE = /^[a-z0-9][a-z0-9-_]*$/i;

/** `@assistant-ui/remote-components-runtime` as seen by bundled code: the tag's `window.rc`. */
export const RUNTIME_SHIM_CODE = [
  `const rc = window.rc;`,
  `if (rc === undefined) throw new Error("[rc] rc-runtime.js must load before the app (add the runtime tag first in <head>)");`,
  `export { rc };`,
].join("\n");

export function resolveComponents(
  root: string,
  option: RemoteComponentsOptions["components"],
): Map<string, string> {
  const out = new Map<string, string>();
  if (option === undefined) return out;
  if (typeof option === "string") {
    const dir = path.resolve(root, option);
    if (!existsSync(dir)) return out;
    for (const file of readdirSync(dir).sort()) {
      const m = /^(.+)\.(tsx|jsx)$/.exec(file);
      if (m === null || m[1]!.includes(".")) continue; // skip *.test.tsx etc.
      out.set(m[1]!, path.join(dir, file));
    }
  } else {
    for (const [name, file] of Object.entries(option))
      out.set(name, path.resolve(root, file));
  }
  for (const name of out.keys()) {
    if (!NAME_RE.test(name))
      throw new Error(
        `[rc] Invalid component name "${name}" (use letters, digits, - and _)`,
      );
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A generated page: what `npm create vite` gives you, plus the runtime tag. */
export function pageDocument(opts: {
  title: string;
  runtime: string;
  head: string;
  scripts: string;
}): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    ${opts.runtime}
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(opts.title)}</title>
    ${opts.head}
  </head>
  <body>
    <div id="root"></div>
    ${opts.scripts}
  </body>
</html>
`;
}

/**
 * A module the entry imports before the component, so it listens for the
 * first `props-changed` before the component module runs (a component
 * with top-level await would otherwise run the entry's body after the
 * event).
 */
export const FIRST_PROPS_ID = "\0rc-first-props";
export const FIRST_PROPS_CODE = [
  `import { rc } from "@assistant-ui/remote-components-runtime";`,
  `export const firstProps = window.parent === window ? Promise.resolve() : new Promise((r) => rc.addEventListener("props-changed", () => r(), { once: true }));`,
].join("\n");

/**
 * Entry module for a component page: a plain React app. Framed, it first
 * renders once the first `props-changed` has fired (the runtime fires it
 * once the document is parsed and the host connected), so the component
 * never sees empty props. `flushSync` commits that render at once, before
 * the runtime measures for the reveal.
 */
export function entryCode(file: string): string {
  return [
    `import { firstProps } from ${JSON.stringify(FIRST_PROPS_ID)};`,
    `import { createElement } from "react";`,
    `import { flushSync } from "react-dom";`,
    `import { createRoot } from "react-dom/client";`,
    `import { useProps } from "@assistant-ui/remote-components-react";`,
    `import Component from ${JSON.stringify(file)};`,
    `if (typeof Component !== "function" && (typeof Component !== "object" || Component === null)) {`,
    `  throw new Error(${JSON.stringify(`[rc] ${path.basename(file)} must have a default export that is a React component`)});`,
    `}`,
    `function Page() { return createElement(Component, useProps()); }`,
    `const root = createRoot(document.getElementById("root"));`,
    `firstProps.then(() => flushSync(() => root.render(createElement(Page))));`,
  ].join("\n");
}

export function remoteComponents(
  options: RemoteComponentsOptions = {},
): Plugin {
  let config: ResolvedConfig;
  let components = new Map<string, string>();
  const singleCache = new Map<string, Promise<string>>();
  const csp = [
    `connect-src ${connectSrc(options.network)}`,
    ...(options.frameAncestors
      ? [frameAncestorsDirective(options.frameAncestors)]
      : []),
  ].join("; ");
  const base = (): string =>
    config.base.endsWith("/") ? config.base : `${config.base}/`;
  const tag = (): string => `<script src="${base()}rc-runtime.js"></script>`;

  const single = (name: string, file: string): Promise<string> => {
    let p = singleCache.get(name);
    if (p === undefined) {
      p = import("./single.js").then(({ buildSingleFile }) =>
        buildSingleFile({
          file,
          name,
          root: config.root,
          plugins: options.singleFile?.plugins ?? [],
          head: options.head ?? "",
        }),
      );
      p.catch(() => singleCache.delete(name));
      singleCache.set(name, p);
    }
    return p;
  };

  return {
    name: "remote-components",

    config(userConfig, env) {
      const root = path.resolve(userConfig.root ?? process.cwd());
      components = resolveComponents(root, options.components);
      // Remote code is public. Opaque-origin remotes (sandbox without
      // allow-same-origin) fetch their scripts with `Origin: null`.
      if (env.command !== "build") {
        return {
          server: { cors: userConfig.server?.cors ?? { origin: "*" } },
          preview: { cors: userConfig.preview?.cors ?? { origin: "*" } },
        };
      }
      if (components.size === 0) return {};
      const input: Record<string, string> = {};
      for (const name of components.keys()) input[name] = ENTRY_PREFIX + name;
      return { build: { rollupOptions: { input } } };
    },

    configResolved(c) {
      config = c;
    },

    resolveId(id) {
      if (id.startsWith(ENTRY_PREFIX)) return "\0" + id;
      if (id === "@assistant-ui/remote-components-runtime") return RUNTIME_SHIM;
      if (id === FIRST_PROPS_ID) return FIRST_PROPS_ID;
      return null;
    },

    load(id) {
      if (id === RUNTIME_SHIM) return RUNTIME_SHIM_CODE;
      if (id === FIRST_PROPS_ID) return FIRST_PROPS_CODE;
      if (id.startsWith(RESOLVED_PREFIX)) {
        const file = components.get(id.slice(RESOLVED_PREFIX.length));
        if (file === undefined) throw new Error(`[rc] Unknown component ${id}`);
        return entryCode(file);
      }
      return null;
    },

    transformIndexHtml: {
      order: "pre",
      handler(html) {
        if (options.injectIndex === false || html.includes("rc-runtime.js"))
          return html;
        return html.replace(/<head(\s[^>]*)?>/i, (h) => `${h}\n    ${tag()}`);
      },
    },

    configureServer(server: ViteDevServer) {
      const refresh = (): void => {
        components = resolveComponents(config.root, options.components);
      };
      server.watcher.on("add", refresh);
      server.watcher.on("unlink", refresh);
      server.watcher.on("change", () => singleCache.clear());
      const runtime = remoteComponentsMiddleware({ runtimeBase: base() });
      server.middlewares.use((req, res, next) => void runtime(req, res, next));
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? "/", "http://x");
        const sm = /^\/([^/]+)\/single\.html$/.exec(url.pathname);
        if (sm !== null && options.singleFile && components.has(sm[1]!)) {
          single(sm[1]!, components.get(sm[1]!)!)
            .then((html) => {
              res.writeHead(200, {
                "content-type": "text/html; charset=utf-8",
                "access-control-allow-origin": "*",
              });
              res.end(html);
            })
            .catch(next);
          return;
        }
        const m = /^\/([^/]+)\/?(?:index\.html)?$/.exec(url.pathname);
        if (
          m === null ||
          !components.has(m[1]!) ||
          (req.method !== "GET" && req.method !== "HEAD")
        )
          return next();
        const name = m[1]!;
        if (!url.pathname.endsWith("/")) {
          res.writeHead(308, { location: `/${name}/${url.search}` });
          res.end();
          return;
        }
        const html = pageDocument({
          title: name,
          runtime: tag(),
          head: options.head ?? "",
          scripts: `<script type="module" src="/@id/__x00__${ENTRY_PREFIX}${name}"></script>`,
        });
        // Not transformIndexHtml's injection: the page has its tag already.
        server
          .transformIndexHtml(url.pathname, html, req.originalUrl)
          .then((out) => {
            // Dev only: HMR needs its websocket, so connect-src stays open.
            res.writeHead(200, {
              "content-type": "text/html; charset=utf-8",
              "cache-control": "no-store",
              // Lets a host tighten the network with <iframe csp> (SPEC §12).
              "allow-csp-from": "*",
              ...(options.frameAncestors
                ? {
                    "content-security-policy": frameAncestorsDirective(
                      options.frameAncestors,
                    ),
                  }
                : {}),
            });
            res.end(out);
          })
          .catch(next);
      });
    },

    async writeBundle(outputOptions) {
      if (!options.singleFile) return;
      const { writeFile, mkdir } = await import("node:fs/promises");
      const dir =
        outputOptions.dir ?? path.resolve(config.root, config.build.outDir);
      for (const [name, file] of components) {
        const html = await single(name, file);
        await mkdir(path.join(dir, name), { recursive: true });
        await writeFile(path.join(dir, name, "single.html"), html);
      }
    },

    generateBundle(_opts, bundle) {
      for (const f of RUNTIME_FILES)
        this.emitFile({
          type: "asset",
          fileName: f,
          source: readFileSync(path.join(RUNTIME_DIR, f), "utf8"),
        });
      const manifest: Record<
        string,
        { html: string; js: string; css: string[] }
      > = {};
      for (const chunk of Object.values(bundle)) {
        if (
          chunk.type !== "chunk" ||
          !chunk.isEntry ||
          !chunk.facadeModuleId?.startsWith(RESOLVED_PREFIX)
        )
          continue;
        const name = chunk.facadeModuleId.slice(RESOLVED_PREFIX.length);
        const css = new Set<string>();
        const preload = new Set<string>();
        const visit = (fileName: string, seen: Set<string>): void => {
          if (seen.has(fileName)) return;
          seen.add(fileName);
          const c = bundle[fileName];
          if (c === undefined || c.type !== "chunk") return;
          const meta = (c as { viteMetadata?: { importedCss?: Set<string> } })
            .viteMetadata;
          for (const f of meta?.importedCss ?? []) css.add(f);
          for (const imp of c.imports) {
            if (imp !== chunk.fileName) preload.add(imp);
            visit(imp, seen);
          }
        };
        visit(chunk.fileName, new Set());
        const head = [
          ...[...css].map(
            (f) => `<link rel="stylesheet" href="${base()}${f}" />`,
          ),
          ...[...preload].map(
            (f) => `<link rel="modulepreload" href="${base()}${f}" />`,
          ),
          options.head ?? "",
        ].join("\n    ");
        const html = pageDocument({
          title: name,
          runtime: tag(),
          head,
          scripts: `<script type="module" src="${base()}${chunk.fileName}"></script>`,
        });
        this.emitFile({
          type: "asset",
          fileName: `${name}/index.html`,
          source: html,
        });
        manifest[name] = {
          html: `${name}/index.html`,
          js: chunk.fileName,
          css: [...css],
        };
      }
      this.emitFile({
        type: "asset",
        fileName: "remote-components.json",
        source: JSON.stringify(
          { protocol: 3, runtime: "rc-runtime.js", components: manifest },
          null,
          2,
        ),
      });
      const headers = [
        "/*",
        "  Access-Control-Allow-Origin: *",
        "  X-Content-Type-Options: nosniff",
        "  Allow-CSP-From: *",
        `  Content-Security-Policy: ${csp}`,
      ];
      this.emitFile({
        type: "asset",
        fileName: "_headers",
        source: `${headers.join("\n")}\n`,
      });
    },
  };
}

export default remoteComponents;
export { buildSingleFile, type SingleFileOptions } from "./single.js";
