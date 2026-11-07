import { existsSync, readFileSync, readdirSync } from "node:fs";
import type { KnipConfig } from "knip";

const distTargets = (value: unknown): string[] => {
  if (typeof value === "string")
    return value.startsWith("./dist/") ? [value] : [];
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(distTargets);
};

const toSourceGlob = (target: string) =>
  target
    .replace(/\?.*$/, "")
    .replace(/^\.\/dist\//, "src/")
    .replace(/\.d\.ts$|\.(?:m|c)?js$/, ".{ts,tsx,mts}");

const extraEntries: Record<string, string[]> = {
  "packages/generative-frame": [
    "demo/*.{ts,tsx}",
    "demo/vite.config.mjs",
    "scripts/runtime-entry.ts",
    "scripts/bundle-fixtures/*.ts",
  ],
  "packages/metro": ["src/__fixtures__/*.cjs"],
  "packages/remote-components-conformance": [
    "*.{ts,mjs}",
    "apps/*/vite.config.ts",
    "apps/*/src/main.tsx",
    "components/*.tsx",
    "host/main.tsx",
    "scf-shim/server.mjs",
    "scripts/*.mjs",
    "tests/*.spec.ts",
  ],
  "packages/remote-components-runtime": [
    "build-script.mjs",
    "src/script.ts",
    "src/chunk-*.ts",
    "src/chunks-script.ts",
  ],
  "packages/react-devtools": ["src/styles/panel.css"],
  "packages/ui": ["src/**/*.{ts,tsx}"],
  "packages/variants": ["demo/main.tsx", "demo/vite.config.ts"],
  "packages/x-performance": ["fixtures/*.css"],
};

// Knip's vite plugin loads the config, which imports a workspace package
// through its unbuilt dist; the config stays an entry and is parsed instead.
const workspaceOverrides: Record<string, { vite: false }> = {
  "packages/remote-components-conformance": { vite: false },
};

const packageWorkspaces = Object.fromEntries(
  readdirSync("packages", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `packages/${entry.name}`)
    .filter((dir) => existsSync(`${dir}/package.json`))
    .map((dir) => {
      const pkg = JSON.parse(readFileSync(`${dir}/package.json`, "utf8"));
      const entry = [
        ...new Set(
          [pkg.exports, pkg.imports, pkg.main, pkg.module, pkg.bin]
            .flatMap(distTargets)
            .map(toSourceGlob),
        ),
      ];
      entry.push(...(extraEntries[dir] ?? []));
      return [
        dir,
        {
          ...(entry.length > 0 ? { entry } : {}),
          ...workspaceOverrides[dir],
        },
      ];
    }),
);

const config: KnipConfig = {
  ignoreWorkspaces: [
    "apps/**",
    "examples/**",
    "templates/**",
    "evals",
    "api-surface",
  ],
  ignore: [
    "api-surface/**",
    "scripts/lib/*.d.mts",
    "packages/remote-components-conformance/corpus/generate.mjs",
    "packages/remote-components-conformance/spikes/**",
  ],
  ignoreBinaries: ["expo", "vercel", "wrangler"],
  ignoreUnresolved: ["aui-build", "browser-process", /[./]generated$/],
  workspaces: {
    ".": {
      entry: [
        "scripts/build-example-bundle.mjs",
        "scripts/lib/turbo-build-cache-fixture.mjs",
        "scripts/package-cloud-harness-template.mjs",
        "scripts/prepare-example-bundles.mjs",
      ],
      // Git hooks live in .husky (core.hooksPath) without the husky package,
      // so enable the plugin explicitly to parse them (e.g. lint-staged).
      husky: true,
    },
    ...packageWorkspaces,
  },
};

export default config;
