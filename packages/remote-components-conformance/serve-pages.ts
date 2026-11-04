import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Connect, Plugin, ViteDevServer } from "vite";
import {
  injectHead,
  normalizeHtml,
  runtimeTag,
  streamPrefix,
} from "@assistant-ui/remote-components-serve";

/**
 * Pages for the conformance remote server (127.0.0.1:5181), through the
 * serving layer (@assistant-ui/remote-components-serve):
 *
 *   /__html/<dir>/<file>.html    a page from conformance/<dir> (pages, corpus), normalized
 *   /__htmlq/<dir>/<file>.html   the runtime tag added as an author would (no doctype added)
 *   /__raw/<dir>/<file>.html     untouched: no runtime (zero-runtime baseline)
 *   /__stream/<dir>/<file>.html  normalized and written in chunks (simulated tokens)
 *   /__page/static/<c>/?p=JSON   component <c> rendered to static HTML (plus the
 *                                component's `staticScript`, if any), normalized
 *   /__app/<name>/…              a create-vite app built with plain `vite build`
 *   /slow/?delay=ms              the `slow` component page, sent after `delay` ms (default 1200)
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIRS = new Set(["pages", "corpus", "fixtures"]);

type Vite = typeof import("vite");

export function servePages(vite: Vite): Plugin {
  const apps = new Map<string, Promise<string>>();
  const buildApp = (name: string): Promise<string> => {
    let p = apps.get(name);
    if (p === undefined) {
      const root = path.join(HERE, "apps", name);
      const outDir = path.join(root, "dist");
      p = vite
        .build({
          configFile: path.join(root, "vite.config.ts"),
          root,
          logLevel: "warn",
          build: { outDir, emptyOutDir: true },
        })
        .then(() => outDir);
      apps.set(name, p);
    }
    return p;
  };
  let server: ViteDevServer | null = null;

  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    const url = new URL(req.url ?? "/", "http://x");
    const send = (
      status: number,
      headers: Record<string, string>,
      body: string | Buffer,
    ): void => {
      res.writeHead(status, {
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
        ...headers,
      });
      res.end(body);
    };
    const html = (body: string, headers: Record<string, string> = {}): void =>
      send(
        200,
        { "content-type": "text/html; charset=utf-8", ...headers },
        body,
      );
    const page = (body: string): void => {
      const out = normalizeHtml(body);
      html(out.html, out.headers);
    };
    const fail = (e: unknown): void =>
      send(
        500,
        { "content-type": "text/plain" },
        String((e as Error)?.stack ?? e),
      );

    // A slow server: the page itself cannot delay its reveal.
    if (
      /^\/slow\/(index\.html)?$/.test(url.pathname) &&
      !(req.headers["x-rc-delayed"] === "1")
    ) {
      req.headers["x-rc-delayed"] = "1";
      setTimeout(
        () => middleware(req, res, next),
        Number(url.searchParams.get("delay") ?? 1200),
      );
      return;
    }

    let m = /^\/__page\/static\/([a-z0-9-]+)\/?$/.exec(url.pathname);
    if (m !== null) {
      if (server === null)
        return send(
          501,
          { "content-type": "text/plain" },
          "static pages need the dev server (ssrLoadModule)",
        );
      const file = path.join(HERE, "components", `${m[1]}.tsx`);
      const props = JSON.parse(url.searchParams.get("p") ?? "{}") as Record<
        string,
        unknown
      >;
      Promise.all([
        server.ssrLoadModule(file),
        import("react"),
        import("react-dom/server"),
      ])
        .then(([mod, React, Server]) => {
          const markup = Server.renderToStaticMarkup(
            React.createElement(
              mod.default as import("react").FunctionComponent,
              props,
            ),
          );
          const script =
            typeof mod.staticScript === "string"
              ? `<script>${mod.staticScript}</script>`
              : "";
          page(
            `<html><head><meta charset="utf-8"><title>${m![1]}</title></head><body>${markup}${script}</body></html>`,
          );
        })
        .catch(fail);
      return;
    }

    m =
      /^\/__(html|htmlq|raw|stream)\/([a-z0-9-]+)\/([A-Za-z0-9._-]+\.html)$/.exec(
        url.pathname,
      );
    if (m !== null && DIRS.has(m[2]!)) {
      const file = path.join(HERE, m[2]!, m[3]!);
      if (!existsSync(file))
        return send(404, { "content-type": "text/plain" }, "not found");
      const src = readFileSync(file, "utf8");
      switch (m[1]) {
        case "raw":
          return html(src);
        case "html":
          return page(src);
        case "htmlq":
          // Author-placed tag: the document mode is whatever the author wrote.
          return html(injectHead(src, runtimeTag()));
        default: {
          const body = streamPrefix() + src;
          const chunk = Number(url.searchParams.get("chunk") ?? 64);
          const ms = Number(url.searchParams.get("ms") ?? 30);
          res.writeHead(200, {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
          });
          let i = 0;
          const tick = (): void => {
            if (i >= body.length) return void res.end();
            res.write(body.slice(i, (i += chunk)));
            setTimeout(tick, ms);
          };
          tick();
          return;
        }
      }
    }

    m = /^\/__app\/([a-z0-9-]+)(\/.*)$/.exec(url.pathname);
    if (m !== null) {
      const rel = m[2] === "/" ? "/index.html" : m[2]!;
      buildApp(m[1]!)
        .then((dir) => {
          const file = path.join(dir, path.normalize(rel));
          if (
            !file.startsWith(dir) ||
            !existsSync(file) ||
            !statSync(file).isFile()
          )
            return send(404, { "content-type": "text/plain" }, "not found");
          const type = file.endsWith(".html")
            ? "text/html; charset=utf-8"
            : file.endsWith(".js")
              ? "text/javascript"
              : file.endsWith(".css")
                ? "text/css"
                : file.endsWith(".svg")
                  ? "image/svg+xml"
                  : "application/octet-stream";
          send(200, { "content-type": type }, readFileSync(file));
        })
        .catch(fail);
      return;
    }
    next();
  };

  return {
    name: "conformance-pages",
    configureServer(s) {
      server = s;
      s.middlewares.use(middleware);
    },
    configurePreviewServer(s) {
      s.middlewares.use(middleware);
    },
  };
}
