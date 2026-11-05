import path from "node:path";
import type { InlineConfig, PluginOption, Rollup } from "vite";
import { readRuntime } from "@assistant-ui/remote-components-serve/node";
import {
  entryCode,
  FIRST_PROPS_CODE,
  FIRST_PROPS_ID,
  pageDocument,
  RUNTIME_SHIM_CODE,
} from "./index.js";

export interface SingleFileOptions {
  /** Component file (default export). */
  file: string;
  /** Document title. Default: file name. */
  name?: string;
  /** Plugins for the build, e.g. `[react()]`. */
  plugins?: PluginOption[];
  /** Project root for module resolution. Default: dirname(file). */
  root?: string;
  minify?: boolean;
  /** Extra HTML for <head>. */
  head?: string;
  /** Extra Vite config merged into the build. */
  vite?: InlineConfig;
}

const ENTRY = "virtual:rc-single-entry";

/**
 * Builds one component into a self-contained page: the full runtime,
 * script and CSS inlined, assets as data URLs. For hosts that deliver the
 * document themselves (Safe Content Frame, the `html` prop) and for
 * compile sandboxes.
 */
export async function buildSingleFile(
  options: SingleFileOptions,
): Promise<string> {
  const { build, version } = await import("vite");
  // Vite 8 (Rolldown) renamed inlineDynamicImports and warns on the old name.
  const oneChunk =
    Number(version.split(".")[0]) >= 8
      ? { codeSplitting: false }
      : { inlineDynamicImports: true };
  const file = path.resolve(options.file);
  const name = options.name ?? path.basename(file).replace(/\.[jt]sx?$/, "");
  const result = await build({
    configFile: false,
    root: options.root ?? path.dirname(file),
    logLevel: "warn",
    mode: "production",
    ...options.vite,
    plugins: [
      ...(options.plugins ?? []),
      {
        name: "remote-components-single-entry",
        enforce: "pre",
        resolveId: (id) =>
          id === ENTRY
            ? "\0" + ENTRY
            : id === "@assistant-ui/remote-components-runtime"
              ? "\0rc-runtime-shim"
              : id === FIRST_PROPS_ID
                ? FIRST_PROPS_ID
                : null,
        load: (id) =>
          id === "\0" + ENTRY
            ? entryCode(file)
            : id === "\0rc-runtime-shim"
              ? RUNTIME_SHIM_CODE
              : id === FIRST_PROPS_ID
                ? FIRST_PROPS_CODE
                : null,
      },
    ],
    build: {
      write: false,
      minify: options.minify ?? true,
      cssCodeSplit: false,
      modulePreload: false,
      assetsInlineLimit: () => true,
      target: "es2022",
      rollupOptions: { input: ENTRY, output: oneChunk as Rollup.OutputOptions },
      ...options.vite?.build,
    },
  });
  const outputs = (
    Array.isArray(result) ? result : [result]
  ) as Rollup.RollupOutput[];
  let js = "";
  let css = "";
  for (const out of outputs) {
    for (const item of out.output) {
      if (item.type === "chunk") js += item.code;
      else if (item.fileName.endsWith(".css"))
        css +=
          typeof item.source === "string"
            ? item.source
            : new TextDecoder().decode(item.source);
    }
  }
  const runtime = await readRuntime("rc-runtime.full.js");
  const esc = (s: string, tag: string): string =>
    s.replace(new RegExp(`</${tag}`, "gi"), `<\\/${tag}`);
  return pageDocument({
    title: name,
    runtime: `<script data-rc-runtime>${esc(runtime, "script")}</script>`,
    head: [options.head ?? "", css ? `<style>${esc(css, "style")}</style>` : ""]
      .filter(Boolean)
      .join("\n    "),
    scripts: `<script type="module">${esc(js, "script")}</script>`,
  });
}
