import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { build } from "tsdown";
import { preserveReferenceDirectives } from "./reference-directives";
import { reactCompiler } from "./react-compiler";

const isDev = process.argv.slice(2).includes("dev");

const pkg = JSON.parse(
  readFileSync(resolve(process.cwd(), "package.json"), "utf8"),
);

// Dev mode: re-run the package's `start` script after every rebuild.
let onSuccess: string | undefined;
if (isDev && pkg.scripts?.start) onSuccess = pkg.scripts.start;

// Bare "react" imports in tap-dependent packages route to a tap shim via
// output `paths` (`alias` can't rewrite unbundled external imports); exact
// specifiers only, so "react/jsx-runtime" and "react-dom" stay untouched.
// Reactless packages get the standalone-shim, whose graph never imports react.
const dependsOnTap = ["dependencies", "peerDependencies"].some(
  (field) => pkg[field]?.["@assistant-ui/tap"],
);
const dependsOnReact = ["dependencies", "peerDependencies"].some(
  (field) => pkg[field]?.react,
);
const isTapPackage = pkg.name === "@assistant-ui/tap";
const remapReactToShim = dependsOnTap || isTapPackage;
const isReactless = dependsOnTap && !dependsOnReact;
const shimBase = isReactless
  ? "@assistant-ui/tap/standalone-shim"
  : "@assistant-ui/tap/react-shim";
const packageImportExternals = Object.keys(pkg.imports ?? {});

// A package whose exports map targets `.cjs` files ships a bundled
// CommonJS/node build (a Metro babel transformer must be `require`d
// synchronously). Entries derive from the exports subpaths; declared
// dependencies and peers stay external while workspace devDependencies are
// bundled in, so an ESM-only workspace dependency can ride inside the CJS
// artifact.
const exportTargets = Object.entries(pkg.exports ?? {}).map(([key, value]) => ({
  key,
  target:
    typeof value === "string"
      ? value
      : ((value as Record<string, unknown> | null)?.default as
          | string
          | undefined),
}));
const cjsTargets = exportTargets.filter(
  ({ target }) => typeof target === "string" && target.endsWith(".cjs"),
);
if (cjsTargets.length > 0 && cjsTargets.length !== exportTargets.length) {
  throw new Error(
    "Exports map mixes .cjs and non-.cjs targets; a package builds as either CommonJS or ESM, not both.",
  );
}

if (cjsTargets.length > 0) {
  const externalDeps = Object.keys({
    ...pkg.dependencies,
    ...pkg.peerDependencies,
  });
  const bundledWorkspaceDevDeps = Object.entries(
    (pkg.devDependencies ?? {}) as Record<string, string>,
  )
    .filter(([, range]) => range.startsWith("workspace:"))
    .map(([name]) => name);

  await build({
    entry: cjsTargets.map(({ key }) =>
      key === "." ? "src/index.ts" : `src/${key.slice(2)}.ts`,
    ),
    format: "cjs",
    platform: "node",
    dts: isDev ? false : { sourcemap: true },
    sourcemap: true,
    watch: isDev,
    ...(onSuccess ? { onSuccess } : {}),
    deps: {
      alwaysBundle: bundledWorkspaceDevDeps,
      neverBundle: [/^node:/, ...externalDeps, ...packageImportExternals],
    },
    plugins: [preserveReferenceDirectives()],
  });
  process.exit(0);
}

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
  dts: isDev ? false : { sourcemap: true },
  sourcemap: true,
  watch: isDev,
  ...(onSuccess ? { onSuccess } : {}),
  // React Compiler only for tap+react packages: its memo cache needs the
  // shimmed compiler-runtime, and tap itself must never be compiled.
  plugins: [
    ...(dependsOnTap && dependsOnReact ? [reactCompiler()] : []),
    preserveReferenceDirectives(),
  ],
});

// `output.paths` also rewrites declarations; published `.d.ts` must reference
// real `react`, and tap's own shim runtime must not self-route.
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
