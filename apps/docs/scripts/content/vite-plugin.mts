import type { Plugin } from "vite";
import { generateContentManifest, watchContentManifest } from "./manifest.mts";

/** Writes .source/content.ts before the first compile. */
export function docsContent(): Plugin {
  return {
    name: "docs:content-manifest",
    async configResolved(config) {
      await generateContentManifest(config.root);
      if (config.command === "serve") watchContentManifest(config.root);
    },
  };
}
