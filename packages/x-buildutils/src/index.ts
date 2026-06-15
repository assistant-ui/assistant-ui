import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "tsdown";
import { preserveReferenceDirectives } from "./reference-directives";
import { reactCompiler } from "./react-compiler";

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
// affect unbundled external imports. Exact specifiers only ("react" and
// "react/compiler-runtime", the latter so React Compiler output's memo cache
// routes to tap inside a resource render), so "react/jsx-runtime" and
// "react-dom" are untouched.
//
// Applied to packages that actually depend on `@assistant-ui/tap` (so the
// remapped `@assistant-ui/tap/react-shim` specifier resolves for consumers) and
// to `@assistant-ui/tap` itself so its React-facing hooks can share the same
// React 18 compatibility shim.
const dependsOnTap = ["dependencies", "peerDependencies"].some(
  (field) => pkg[field]?.["@assistant-ui/tap"],
);
const isTapPackage = pkg.name === "@assistant-ui/tap";
const remapReactToShim = dependsOnTap || isTapPackage;

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
            "react/compiler-runtime":
              "@assistant-ui/tap/react-shim/compiler-runtime",
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
  // React Compiler shares the dependency gate: compiled output's memo cache only
  // works inside tap renders through the shimmed `react/compiler-runtime`, and
  // tap itself (which implements the hooks the compiler output runs on) must
  // never be compiled.
  plugins: [
    ...(dependsOnTap ? [reactCompiler()] : []),
    preserveReferenceDirectives(),
  ],
});

// `output.paths` rewrites the `react` specifier in BOTH the emitted JS and the
// declarations. Only the runtime (.js) should route through the shim; declared
// types should reference real `react` (so published `.d.ts` stay clean and the
// shim isn't an editor auto-import source). When building tap itself, the
// runtime shim files must also keep importing real `react` to avoid self-routing.
if (remapReactToShim && !isDev && existsSync("dist")) {
  for (const rel of readdirSync("dist", {
    recursive: true,
    encoding: "utf8",
  })) {
    if (typeof rel !== "string") continue;

    const isDeclaration = rel.endsWith(".d.ts");
    const isTapShimRuntime =
      isTapPackage && rel.startsWith("react-shim/") && rel.endsWith(".js");

    if (!isDeclaration && !isTapShimRuntime) continue;

    const file = resolve("dist", rel);
    const src = readFileSync(file, "utf8");
    const out = src
      .replaceAll(
        '"@assistant-ui/tap/react-shim/compiler-runtime"',
        '"react/compiler-runtime"',
      )
      .replaceAll(
        "'@assistant-ui/tap/react-shim/compiler-runtime'",
        "'react/compiler-runtime'",
      )
      .replaceAll('"@assistant-ui/tap/react-shim"', '"react"')
      .replaceAll("'@assistant-ui/tap/react-shim'", "'react'");
    if (out !== src) writeFileSync(file, out);
  }
}
