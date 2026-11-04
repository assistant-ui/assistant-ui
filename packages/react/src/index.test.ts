/// <reference types="node" />
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

const PACKAGE_DIR = fileURLToPath(new URL("..", import.meta.url));

// The built entry imports React through @assistant-ui/tap/react-shim. Vite
// dev pre-bundles that shim with esbuild, whose CommonJS interop hands it
// React's default export only; the loader below recreates that for the shim.
const script = `
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved = nextResolve(specifier, context);
    if (specifier !== "react" || !context.parentURL?.endsWith("/react-shim/index.js")) return resolved;
    const source = "import React from " + JSON.stringify(resolved.url) + "; export default React;";
    return { url: "data:text/javascript," + encodeURIComponent(source), shortCircuit: true };
  },
});
const entry = await import("@assistant-ui/react");
console.log(typeof entry.ComposerPrimitive.Root, typeof entry.CloudRendererHost);
`;

it("loads the public entry when the react-shim only sees React's default export", () => {
  const result = spawnSync(
    process.execPath,
    [...process.execArgv, "--input-type=module", "--eval", script],
    { cwd: PACKAGE_DIR, encoding: "utf8" },
  );

  expect(result.status, result.stderr).toBe(0);
  expect(result.stdout.trim()).toBe("object function");
});
