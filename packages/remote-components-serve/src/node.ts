import { readFile, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { normalizeHtml, type NormalizeOptions } from "./index.js";

export * from "./index.js";

const require = createRequire(import.meta.url);
/** Directory with rc-runtime.js and its chunks. */
export const RUNTIME_DIR = path.join(
  path.dirname(
    require.resolve("@assistant-ui/remote-components-runtime/package.json"),
  ),
  "dist/script",
);
export const RUNTIME_FILES = [
  "rc-runtime.js",
  "rc-overlays.js",
  "rc-cq.js",
  "rc-runtime.full.js",
] as const;

/** Reads one of the runtime files (for servers that want to serve them themselves). */
export function readRuntime(
  name: (typeof RUNTIME_FILES)[number] = "rc-runtime.js",
): Promise<string> {
  return readFile(path.join(RUNTIME_DIR, name), "utf8");
}

export interface MiddlewareOptions extends Omit<NormalizeOptions, "runtime"> {
  /** Directory of HTML pages. `/x.html` and `/x/` (→ `x/index.html`) are served normalized. Omit to serve only the runtime. */
  root?: string;
  /** URL prefix for the runtime files. Default "/". */
  runtimeBase?: string;
}

type Next = (err?: unknown) => void;

/**
 * Connect/Express-style middleware for a widget origin: serves the runtime
 * (`/rc-runtime.js` and its chunks, cacheable, CORS open so opaque frames
 * can load them) and every HTML page under `root`, normalized.
 */
export function remoteComponentsMiddleware(options: MiddlewareOptions = {}) {
  const base = options.runtimeBase ?? "/";
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: Next,
  ): Promise<void> => {
    try {
      const url = new URL(req.url ?? "/", "http://x");
      if (req.method !== "GET" && req.method !== "HEAD") return next();
      if (url.pathname.startsWith(base)) {
        const name = url.pathname.slice(base.length);
        if ((RUNTIME_FILES as readonly string[]).includes(name)) {
          const body = await readFile(path.join(RUNTIME_DIR, name));
          res.writeHead(200, {
            "content-type": "text/javascript; charset=utf-8",
            "access-control-allow-origin": "*",
            "cache-control": "public, max-age=300",
            "x-content-type-options": "nosniff",
          });
          res.end(req.method === "HEAD" ? undefined : body);
          return;
        }
      }
      if (options.root === undefined) return next();
      let rel = decodeURIComponent(url.pathname);
      if (rel.endsWith("/")) rel += "index.html";
      if (!rel.endsWith(".html")) return next();
      const root = path.resolve(options.root);
      const file = path.join(root, path.normalize(rel));
      if (!file.startsWith(root + path.sep)) return next();
      const s = await stat(file).catch(() => null);
      if (s === null || !s.isFile()) return next();
      const out = normalizeHtml(await readFile(file, "utf8"), {
        ...options,
        runtime: { src: `${base}rc-runtime.js` },
      });
      res.writeHead(200, {
        ...out.headers,
        "access-control-allow-origin": "*",
        "cache-control": "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : out.html);
    } catch (err) {
      next(err);
    }
  };
}
