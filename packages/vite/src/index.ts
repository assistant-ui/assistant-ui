import type { Plugin, TransformResult } from "vite";
import {
  compileGenerative,
  isGenerativeModule,
} from "@assistant-ui/x-generative-compiler";

/** Source modules a `"use generative"` directive can appear in. */
const SOURCE_RE = /\.[cm]?[jt]sx?($|\?)/;

/** Compiles `"use generative"` modules per environment. */
function generativePlugin(): Plugin {
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
      return {
        code: out,
        map: (map ?? null) as Extract<
          TransformResult,
          { map?: unknown }
        >["map"],
      };
    },
  };
}

/**
 * Vite plugin that compiles assistant-ui `"use generative"` modules: files that
 * colocate a tool's schema, server-only `execute`, and client-only `render`.
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
export function aui(): Plugin[] {
  return [generativePlugin()];
}
