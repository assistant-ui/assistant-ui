import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";
import {
  type BuilderConfig,
  DEFAULT_CONFIG,
} from "../components/pages/playground/types";
import { generateRegistryJson } from "./playground-registry";

const docsDir = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const tsc = resolve(
  dirname(require.resolve("typescript/package.json")),
  "bin/tsc",
);

it("type-checks generated registry threads against the docs kit", () => {
  const configs: Record<string, BuilderConfig> = {
    default: DEFAULT_CONFIG,
    "all-components": {
      ...DEFAULT_CONFIG,
      components: {
        ...DEFAULT_CONFIG.components,
        markdown: true,
        reasoning: true,
        sources: true,
        avatar: true,
        followUpSuggestions: true,
        actionBar: { copy: true, reload: true, speak: true, feedback: true },
      },
    },
    "reasoning-sources-plain": {
      ...DEFAULT_CONFIG,
      components: {
        ...DEFAULT_CONFIG.components,
        markdown: false,
        reasoning: true,
        sources: true,
      },
    },
    "sources-plain": {
      ...DEFAULT_CONFIG,
      components: {
        ...DEFAULT_CONFIG.components,
        markdown: false,
        sources: true,
      },
    },
  };
  const cacheDir = join(docsDir, "node_modules", ".cache");
  mkdirSync(cacheDir, { recursive: true });
  const scratchDir = mkdtempSync(join(cacheDir, "playground-registry-"));

  try {
    const files = Object.entries(configs).map(([name, config]) => {
      const file = `${name}.tsx`;
      writeFileSync(
        join(scratchDir, file),
        generateRegistryJson(config).files[0]!.content,
      );
      return file;
    });
    writeFileSync(join(scratchDir, "css.d.ts"), 'declare module "*.css";\n');
    writeFileSync(
      join(scratchDir, "tsconfig.json"),
      JSON.stringify({
        extends: join(docsDir, "tsconfig.json"),
        compilerOptions: { noEmit: true },
        include: [...files, "css.d.ts"],
        exclude: [],
      }),
    );

    const result = spawnSync(
      tsc,
      ["--noEmit", "-p", join(scratchDir, "tsconfig.json")],
      {
        cwd: docsDir,
        encoding: "utf8",
        timeout: 120_000,
      },
    );

    expect(
      result.status,
      [result.error?.message, result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n"),
    ).toBe(0);
  } finally {
    rmSync(scratchDir, { recursive: true, force: true });
  }
}, 150_000);
