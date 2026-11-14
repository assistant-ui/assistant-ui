import { resolve, sep } from "node:path";
import type { Plugin } from "vite";
import { generateContentManifest, watchContentManifest } from "./manifest.mts";

/** Writes .source/content.ts before the first compile. */
export function docsContent(): Plugin {
  return {
    name: "docs:content-manifest",
    async configResolved(config) {
      const options = { appRoot: config.root };
      await generateContentManifest(config.root, options);
      if (config.command === "serve")
        watchContentManifest(config.root, options);
    },
    // Docs pages render on the server, so a content edit leaves no client
    // module to hot-update; reload the page once the regenerated manifest lands.
    configureServer(server) {
      const generated = resolve(server.config.root, ".source") + sep;
      let timer: ReturnType<typeof setTimeout> | undefined;
      server.watcher.on("change", (file) => {
        if (!file.startsWith(generated)) return;
        clearTimeout(timer);
        timer = setTimeout(
          () => server.environments.client.hot.send({ type: "full-reload" }),
          50,
        );
      });
    },
  };
}
