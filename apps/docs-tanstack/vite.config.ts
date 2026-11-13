import { defineConfig, type Plugin } from "vite";
import { fileURLToPath } from "node:url";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import viteTsConfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import mdx from "fumadocs-mdx/vite";
import * as MdxConfig from "./source.config";
import { prerenderPages } from "./src/lib/pages";
import { stubPlugin } from "./src/lib/stub-plugin";

const shim = (f: string) =>
  fileURLToPath(new URL(`./src/shims/${f}`, import.meta.url));

export default defineConfig({
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: [
      {
        find: "collections",
        replacement: fileURLToPath(new URL("./.source", import.meta.url)),
      },
      { find: /^next\/link$/, replacement: shim("next-link.tsx") },
      { find: /^next\/image$/, replacement: shim("next-image.tsx") },
      { find: /^next\/navigation$/, replacement: shim("next-navigation.ts") },
      { find: /^next\/dynamic$/, replacement: shim("next-dynamic.tsx") },
      { find: /^next\/cache$/, replacement: shim("next-cache.ts") },
      { find: /^next\/server$/, replacement: shim("next-server.ts") },
      { find: /^server-only$/, replacement: shim("empty.ts") },
      { find: /^client-only$/, replacement: shim("empty.ts") },
    ],
  },
  plugins: [
    stubPlugin(),
    mdx(MdxConfig),
    viteTsConfigPaths({ projects: ["../docs/tsconfig.json"], loose: true }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: false,
        concurrency: 8,
        failOnError: false,
      },
      pages: prerenderPages().map((path) => ({ path })),
    }),
    viteReact(),
  ] as Plugin[],
});
