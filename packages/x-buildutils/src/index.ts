import { readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import type { Dirent } from "node:fs";
import { builtinModules } from "node:module";
import { join, resolve, sep } from "node:path";
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

// An import the manifest does not declare cannot be resolved by a consumer, so
// the emitted output may only import what the package depends on. tsdown
// matches `deps.onlyImport` against the package name, exempts node builtins
// only on `platform: "node"`, and knows nothing of the bare module a
// `@types/*` package stands in for.
const packageSpecifierName = (specifier: string) =>
  specifier
    .split("/")
    .slice(0, specifier.startsWith("@") ? 2 : 1)
    .join("/");
const declaredDependencies = Object.keys({
  ...pkg.dependencies,
  ...pkg.peerDependencies,
  ...pkg.optionalDependencies,
});
const declaredImports = [
  pkg.name as string,
  ...declaredDependencies,
  ...declaredDependencies
    .filter((name) => name.startsWith("@types/"))
    .map((name) => {
      const bare = name.slice("@types/".length);
      return bare.includes("__") ? `@${bare.replace("__", "/")}` : bare;
    }),
  ...packageImportExternals.map(packageSpecifierName),
  ...builtinModules.flatMap((name) => [name, `node:${name}`]),
];

// `deps.onlyImport` visits import statements; a declaration's inline
// `import("pkg").Type` is a TypeScript import type it never sees, and the react
// shim rewrite below lands after the build, so the emitted declarations are
// checked once the output is final.
const assertDeclaredTypeImports = () => {
  const undeclared = new Map<string, Set<string>>();
  for (const rel of readdirSync("dist", {
    recursive: true,
    encoding: "utf8",
  })) {
    if (typeof rel !== "string" || !/\.d\.[cm]?ts$/.test(rel)) continue;
    const code = readFileSync(resolve("dist", rel), "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      "",
    );
    for (const match of code.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) {
      const name = packageSpecifierName(match[1] ?? "");
      if (!name || name.startsWith(".") || declaredImports.includes(name))
        continue;
      undeclared.set(name, (undeclared.get(name) ?? new Set()).add(rel));
    }
  }
  if (undeclared.size === 0) return;
  throw new Error(
    `Declarations import packages ${pkg.name} does not declare:\n${Array.from(
      undeclared,
      ([name, files]) => `  ${name} in ${Array.from(files).join(", ")}`,
    ).join("\n")}`,
  );
};

// A package whose exports map targets `.cjs` files ships a bundled
// CommonJS/node build (a Metro babel transformer must be `require`d
// synchronously). Entries derive from the exports subpaths; declared
// dependencies and peers stay external while workspace devDependencies are
// bundled in, so an ESM-only workspace dependency can ride inside the CJS
// artifact. Dual-format maps are rejected: every runtime target of a subpath
// must agree on the format.
const SELF_NAME = "@assistant-ui/x-buildutils";

const collectRuntimeTargets = (value: unknown): string[] => {
  if (typeof value === "string") return [value];
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(
    ([condition, nested]) =>
      condition === "types" ? [] : collectRuntimeTargets(nested),
  );
};

const exportEntries = Object.entries(pkg.exports ?? {}).map(([key, value]) => {
  const targets = collectRuntimeTargets(value);
  const cjs = targets.filter((target) => target.endsWith(".cjs"));
  if (cjs.length > 0 && cjs.length !== targets.length) {
    throw new Error(
      `Exports subpath "${key}" mixes .cjs and non-.cjs runtime targets; a package builds as either CommonJS or ESM, not both.`,
    );
  }
  return { key, isCjs: targets.length > 0 && cjs.length === targets.length };
});
const cjsEntries = exportEntries.filter(({ isCjs }) => isCjs);
if (cjsEntries.length > 0 && cjsEntries.length !== exportEntries.length) {
  throw new Error(
    "Exports map mixes .cjs and non-.cjs subpaths; a package builds as either CommonJS or ESM, not both.",
  );
}

if (cjsEntries.length > 0) {
  const escapeRegExp = (name: string) =>
    name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const externalDeps = Object.keys({
    ...pkg.dependencies,
    ...pkg.peerDependencies,
  }).map((name) => new RegExp(`^${escapeRegExp(name)}(/|$)`));
  const bundledWorkspaceDevDeps = Object.entries(
    (pkg.devDependencies ?? {}) as Record<string, string>,
  )
    .filter(
      ([name, range]) => name !== SELF_NAME && range.startsWith("workspace:"),
    )
    .map(([name]) => name);

  await build({
    entry: cjsEntries.map(({ key }) =>
      key === "." ? "src/index.ts" : `src/${key.slice(2)}.ts`,
    ),
    define: { __AUI_PACKAGE_VERSION__: JSON.stringify(pkg.version) },
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
} else {
  // tsdown hands a glob entry to rolldown in tinyglobby's crawl order, which
  // varies per call and reorders emitted imports and inferred type members.
  const toPath = (file: Dirent) =>
    join(file.parentPath, file.name).split(sep).join("/");
  const sources = readdirSync("src", { recursive: true, withFileTypes: true });

  // Test support is unreachable through an exports map, and building it drags
  // devDependencies such as vitest into the published output.
  const entry = sources
    .filter(
      (file) =>
        file.isFile() &&
        /\.tsx?$/.test(file.name) &&
        !/\.(test|bench)\.tsx?$/.test(file.name) &&
        !/^testUtils\.tsx?$/.test(file.name),
    )
    .map(toPath)
    .filter((file) =>
      file
        .split("/")
        .every(
          (segment) =>
            segment !== "__tests__" &&
            segment !== "tests" &&
            !segment.startsWith("."),
        ),
    )
    .sort();

  // A glob metacharacter sends the whole list back through tsdown's glob() and
  // restores the crawl order; a symbolic link reports isFile() false and drops.
  const unrepresentable = [
    ...entry.filter((file) => /[*?[\]{}()!]/.test(file)),
    ...sources.filter((file) => file.isSymbolicLink()).map(toPath),
  ];
  if (unrepresentable.length > 0) {
    throw new Error(
      `Source paths a sorted entry list cannot represent: ${unrepresentable.join(", ")}`,
    );
  }

  await build({
    entry,
    define: { __AUI_PACKAGE_VERSION__: JSON.stringify(pkg.version) },
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
      // Package specifiers stay external without being resolved; `neverBundle: true` would resolve the package's own `#` imports instead of keeping them for their runtime conditions.
      neverBundle: [
        /^node:/,
        ...packageImportExternals,
        /^(?:@[a-z0-9-][a-z0-9-._]*\/)?[a-z0-9-][a-z0-9-._]*(?:\/|$)/,
      ],
      onlyBundle: [],
      onlyImport: declaredImports,
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
        .replaceAll(
          `"${shimBase}/compiler-runtime"`,
          '"react/compiler-runtime"',
        )
        .replaceAll(
          `'${shimBase}/compiler-runtime'`,
          "'react/compiler-runtime'",
        )
        .replaceAll(`"${shimBase}"`, '"react"')
        .replaceAll(`'${shimBase}'`, "'react'");
      if (out !== src) writeFileSync(file, out);
    }
  }
}

if (!isDev) assertDeclaredTypeImports();
