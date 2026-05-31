import type { Plugin } from "vite";
import {
  compileGenerative,
  isGenerativeModule,
} from "@assistant-ui/x-generative-compiler";

/** Source modules a `"use generative"` directive can appear in. */
const SOURCE_RE = /\.[cm]?[jt]sx?($|\?)/;

/**
 * Vite plugin that compiles assistant-ui `"use generative"` modules — files that
 * colocate a tool's schema, server-only `execute`, and client-only `render`.
 *
 * Unlike the Next.js integration, no facade/redirect is needed: Vite's
 * Environment API lets one `transform` emit a different build per environment.
 * The `client` environment gets the client build (`render`, frontend `execute`);
 * every server environment (TanStack Start's `ssr`, where the chat route and
 * server functions are bundled) gets the server build (backend `execute`).
 *
 * Add it to `vite.config`; `enforce: "pre"` makes it run ahead of
 * `@vitejs/plugin-react`'s JSX transform, so array placement doesn't matter:
 *
 * ```ts
 * import { aui } from "@assistant-ui/vite";
 * export default defineConfig({
 *   plugins: [aui(), tanstackStart(), viteReact()],
 * });
 * ```
 */
export function aui(): Plugin {
  return {
    name: "assistant-ui:use-generative",
    enforce: "pre",
    transform(code, id, options) {
      if (!SOURCE_RE.test(id)) return;
      if (!isGenerativeModule(code)) return;

      // Vite 6+ exposes the environment; `consumer` is the stable client/server
      // axis. Fall back to the legacy `options.ssr` boolean for older Vite.
      const consumer = this.environment?.config?.consumer;
      const isClient = consumer ? consumer === "client" : !options?.ssr;

      const { code: out, map } = compileGenerative(code, {
        target: isClient ? "client" : "server",
        filename: id,
        sourceMaps: true,
        // No `react-server` layer here, so `server-only` would throw on import.
        // The environment split already keeps `execute` out of the client.
        injectServerOnly: false,
      });
      return { code: out, map: map ?? null };
    },
  };
}
