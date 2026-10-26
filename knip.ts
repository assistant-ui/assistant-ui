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
  "packages/react-devtools": ["src/styles/panel.css"],
  "packages/ui": ["src/**/*.{ts,tsx}"],
  "packages/variants": ["demo/main.tsx", "demo/vite.config.ts"],
  "packages/x-performance": ["fixtures/*.css"],
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
      return [dir, entry.length > 0 ? { entry } : {}];
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
  ignore: ["api-surface/**", "scripts/lib/*.d.mts"],
  ignoreBinaries: ["expo", "vercel", "wrangler"],
  ignoreUnresolved: ["aui-build", "browser-process", /[./]generated$/],
  workspaces: {
    ".": {
      entry: [
        "scripts/build-example-bundle.mjs",
        "scripts/package-cloud-harness-template.mjs",
        "scripts/prepare-example-bundles.mjs",
      ],
    },
    ...packageWorkspaces,
  },
};

export default config;
