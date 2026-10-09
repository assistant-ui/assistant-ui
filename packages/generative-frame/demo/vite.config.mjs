import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const screenshots = resolve(here, "../.screenshots");

/** Lets the demo page save widget screenshots and run reports to .screenshots/. */
const saveArtifacts = {
  name: "save-artifacts",
  configureServer(server) {
    server.middlewares.use("/__save", (req, res) => {
      const name =
        new URL(req.url ?? "", "http://x").searchParams.get("name") ?? "";
      if (req.method !== "POST" || !/^[\w.-]+$/.test(name)) {
        res.statusCode = 400;
        res.end();
        return;
      }
      const chunks = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        mkdirSync(screenshots, { recursive: true });
        const match = /^data:image\/png;base64,(.*)$/.exec(body);
        writeFileSync(
          resolve(screenshots, name),
          match ? Buffer.from(match[1], "base64") : body,
        );
        res.end("ok");
      });
    });
  },
};

export default defineConfig({
  root: here,
  plugins: [saveArtifacts],
  server: { port: 5199, strictPort: true },
  // Workspace packages are not pre-bundled by default, and @assistant-ui/tap's
  // React shim re-exports CommonJS React, which only works pre-bundled.
  optimizeDeps: { include: ["@assistant-ui/react"] },
});
