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

// Route bare `react` imports through a tap shim so resource code can import
// hooks from "react" and have them resolve to tap inside a resource render.
// Done with output `paths` (remap of the external specifier) so the import
// stays external and only the specifier is rewritten — `alias` does not affect
// unbundled external imports. Exact specifiers only ("react" and
// "react/compiler-runtime", the latter so React Compiler output's memo cache
// routes to tap inside a resource render), so "react/jsx-runtime" and
// "react-dom" are untouched.
//
// Applied to packages that actually depend on `@assistant-ui/tap` (so the
// remapped shim specifier resolves for consumers) and to `@assistant-ui/tap`
// itself so its React-facing hooks can share the same React 18 compatibility
// shim. The target depends on whether the package declares a react peer:
// packages with one get the react-shim (falls back to real React outside a tap
// render), while reactless packages — non-React framework bridges like a vue
// binding — get the standalone-shim, whose graph never imports react so the
// published output stays loadable without React installed. Tap itself always
// keeps the react-shim (`isReactless` requires a tap dependency, which tap
// lacks) and its React-facing entry needs the real-React fallback.
const dependsOnTap = ["dependencies", "peerDependencies"].some(
  (field) => pkg[field]?.["@assistant-ui/tap"],
);
const isTapPackage = pkg.name === "@assistant-ui/tap";
const remapReactToShim = dependsOnTap || isTapPackage;
const isReactless = dependsOnTap && !pkg.peerDependencies?.react;
const shimBase = isReactless
  ? "@assistant-ui/tap/standalone-shim"
  : "@assistant-ui/tap/react-shim";
const packageImportExternals = Object.keys(pkg.imports ?? {});

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
            react: shimBase,
            "react/compiler-runtime": `${shimBase}/compiler-runtime`,
          },
        }),
      }
    : {}),
  platform: "neutral",
  unbundle: true,
  deps: {
    neverBundle: [/^node:/, ...packageImportExternals],
    skipNodeModulesBundle: true,
  },
  // Skip declaration files in dev for faster reloads.
  dts: isDev ? false : { sourcemap: true },
  sourcemap: true,
  watch: isDev,
  ...(onSuccess ? { onSuccess } : {}),
  // React Compiler shares the dependency gate, narrowed to packages that
  // declare a react peer: compiled output's memo cache only works inside tap
  // renders through the shimmed `react/compiler-runtime`. Tap itself (which
  // implements the hooks the compiler output runs on) must never be compiled,
  // and neither must a non-React framework bridge, whose use-prefixed
  // composables would otherwise gain memo caches that run outside any render
  // the compiler understands.
  plugins: [
    ...(dependsOnTap && pkg.peerDependencies?.react ? [reactCompiler()] : []),
    preserveReferenceDirectives(),
  ],
});

// `output.paths` rewrites the `react` specifier in BOTH the emitted JS and the
// declarations. Only the runtime (.js) should route through the shim (react-
// or standalone-, whichever `shimBase` selected); declared types should
// reference real `react` (so published `.d.ts` stay clean and the shim isn't
// an editor auto-import source). When building tap itself, the
// runtime shim files must also keep importing real `react` to avoid self-routing.
if (remapReactToShim && !isDev && existsSync("dist")) {
  for (const rel of readdirSync("dist", {
    recursive: true,
    encoding: "utf8",
  })) {
    if (typeof rel !== "string") continue;

    const normalizedRel = rel.replaceAll("\\", "/");
    const isDeclaration = normalizedRel.endsWith(".d.ts");
    const isTapShimRuntime =
      isTapPackage &&
      normalizedRel.startsWith("react-shim/") &&
      normalizedRel.endsWith(".js");

    if (!isDeclaration && !isTapShimRuntime) continue;

    const file = resolve("dist", rel);
    const src = readFileSync(file, "utf8");
    const out = src
      .replaceAll(`"${shimBase}/compiler-runtime"`, '"react/compiler-runtime"')
      .replaceAll(`'${shimBase}/compiler-runtime'`, "'react/compiler-runtime'")
      .replaceAll(`"${shimBase}"`, '"react"')
      .replaceAll(`'${shimBase}'`, "'react'");
    if (out !== src) writeFileSync(file, out);
  }
}
