import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "tsdown";
import { preserveReferenceDirectives } from "./reference-directives";

const isDev = process.argv.slice(2).includes("dev");

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
);

// In dev mode, run the package's `start` script after each successful build.
// tsdown tree-kills the previous process and re-runs the command on every
// rebuild, giving us watch + reload.
let onSuccess: string | undefined;
if (isDev && pkg.scripts?.start) onSuccess = pkg.scripts.start;

// Route bare `react` imports through tap's react-shim so resource code can
// import hooks from "react" and have them resolve to tap inside a resource
// render. Done with output `paths` (remap of the external specifier) so the
// import stays external and only the specifier is rewritten — `alias` does not
// affect unbundled external imports. Exact "react" only, so "react/jsx-runtime"
// and "react-dom" are untouched.
//
// Only applied to packages that actually depend on `@assistant-ui/tap` (so the
// remapped `@assistant-ui/tap/react-shim` specifier resolves for consumers).
// `@assistant-ui/tap` itself naturally falls out — it doesn't depend on itself,
// so it keeps the real react that its react-shim re-exports.
const remapReactToShim = ["dependencies", "peerDependencies"].some(
  (field) => pkg[field]?.["@assistant-ui/tap"],
);

await build({
  entry: [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
  ],
  ...(remapReactToShim
    ? {
        outputOptions: (options) => ({
          ...options,
          paths: {
            ...(options.paths as Record<string, string>),
            react: "@assistant-ui/tap/react-shim",
          },
        }),
      }
    : {}),
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

// `output.paths` rewrites the `react` specifier in BOTH the emitted JS and the
// declarations. Only the runtime (.js) should route through the shim; declared
// types should reference real `react` (so published `.d.ts` stay clean and the
// shim isn't an editor auto-import source). Revert the specifier in dist `.d.ts`.
if (remapReactToShim && !isDev && existsSync("dist")) {
  for (const rel of readdirSync("dist", {
    recursive: true,
    encoding: "utf8",
  })) {
    if (typeof rel !== "string" || !rel.endsWith(".d.ts")) continue;
    const file = resolve("dist", rel);
    const src = readFileSync(file, "utf8");
    const out = src
      .replaceAll('"@assistant-ui/tap/react-shim"', '"react"')
      .replaceAll("'@assistant-ui/tap/react-shim'", "'react'");
    if (out !== src) writeFileSync(file, out);
  }
}
