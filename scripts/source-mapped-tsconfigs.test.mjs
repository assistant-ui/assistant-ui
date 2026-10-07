import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const repoRoot = path.resolve(import.meta.dirname, "..");

// Packages whose types other packages extend with `declare module`. An
// augmentation only reaches the copy of the package it resolves to, so a
// tsconfig that reads one entry point from src and another from dist ends up
// with an augmented and an unaugmented `AssistantClient` in the same program.
const AUGMENTED_PACKAGES = ["core", "store"];
const SOURCE_WILDCARD = "@assistant-ui/*";

const readJson = (file) =>
  JSON.parse(readFileSync(path.join(repoRoot, file), "utf8"));

function resolveThroughPaths(paths, specifier) {
  let best;
  for (const [pattern, [target]] of Object.entries(paths)) {
    const [prefix, suffix] = pattern.split("*");
    const matches =
      suffix === undefined
        ? specifier === pattern
        : specifier.startsWith(prefix) && specifier.endsWith(suffix);
    if (!matches) continue;
    if (best && best.prefix.length >= prefix.length) continue;
    const captured = specifier.slice(
      prefix.length,
      specifier.length - (suffix ?? "").length,
    );
    best = { prefix, target: target.replace("*", captured) };
  }
  return best?.target;
}

const sourceMappedTsconfigs = globSync(
  "{apps,examples,templates}/*/tsconfig.json",
  {
    cwd: repoRoot,
  },
).filter((file) => readJson(file).compilerOptions?.paths?.[SOURCE_WILDCARD]);

test("finds the tsconfigs that map workspace packages to source", () => {
  assert.ok(
    sourceMappedTsconfigs.includes(
      "examples/with-chain-of-thought/tsconfig.json",
    ),
  );
});

for (const file of sourceMappedTsconfigs) {
  test(`${file} reads every entry point of an augmented package from source`, () => {
    const { paths } = readJson(file).compilerOptions;
    for (const dir of AUGMENTED_PACKAGES) {
      const pkg = readJson(`packages/${dir}/package.json`);
      const sourceRoot = path.join(repoRoot, "packages", dir, "src");
      for (const entry of Object.keys(pkg.exports)) {
        if (entry === "./package.json") continue;
        const specifier = path.posix.join(pkg.name, entry);
        const target = resolveThroughPaths(paths, specifier);
        assert.ok(
          target &&
            path
              .resolve(repoRoot, path.dirname(file), target)
              .startsWith(sourceRoot),
          `${specifier} resolves to ${target ?? "the built dist"}; map it to packages/${dir}/src in ${file}`,
        );
      }
    }
  });
}
