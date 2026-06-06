import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "tsdown";
import { preserveReferenceDirectives } from "./reference-directives";

const isDev = process.argv.slice(2).includes("dev");

// In dev mode, run the package's `start` script after each successful build.
// tsdown tree-kills the previous process and re-runs the command on every
// rebuild, giving us watch + reload.
let onSuccess: string | undefined;
if (isDev) {
  const pkg = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
  );
  if (pkg.scripts?.start) onSuccess = pkg.scripts.start;
}

await build({
  entry: [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
  ],
  platform: "neutral",
  unbundle: true,
  deps: { neverBundle: /^node:/, skipNodeModulesBundle: true },
  // Skip declaration files in dev for faster reloads.
  dts: isDev ? false : { sourcemap: true },
  sourcemap: true,
  watch: isDev,
  ...(onSuccess ? { onSuccess } : {}),
  plugins: [preserveReferenceDirectives()],
});
