import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// Two mistakes a live docs sample can make without any test noticing:
// - An MDX page imports a sample that builds a runtime statically. MDX imports
//   reach every page of the docs route, so that sample's code ships to all of
//   them. Such samples load through `lazyComponent` (`*.lazy.tsx`) instead.
// - A sample renders `Thread` with no runtime of its own. Docs pages render
//   inside the docs assistant's runtime, so that `Thread` silently sends to the
//   paid docs assistant. A sample brings its own runtime or a `SampleScope`.

const docsRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const rel = (file: string) => relative(docsRoot, file).replaceAll("\\", "/");

/** A runtime of the sample's own: one of the runtime hooks, or a component that provides one. */
const OWN_RUNTIME =
  /\buse(?:Local|ExternalStore|RemoteThreadList|Chat|AssistantTransport|DataStream|Sample)Runtime\(|<(?:SampleRuntimeProvider|RuntimeDemo|ThreadListRuntime)\b/;
/** Shields its children from the docs assistant's runtime. */
const SCOPED = /<SampleScope\b/;
const RENDERS_THREAD =
  /import\s*\{[^}]*\bThread\b[^}]*\}\s*from\s*["']@\/components\/assistant-ui\/elements\/thread(?:\.aui)?["'][^]*<Thread\b/;
const STATIC_IMPORT = /^\s*import\s+(?!type\b)[^;]*?from\s*["']([^"']+)["']/gm;

function walk(dir: string, accept: (file: string) => boolean): string[] {
  return readdirSync(dir).flatMap((name) => {
    const file = join(dir, name);
    if (statSync(file).isDirectory()) return walk(file, accept);
    return accept(file) ? [file] : [];
  });
}

/** An MDX page without its code blocks and inline code, which show code rather than render it. */
const stripCodeFences = (mdx: string) =>
  mdx.replace(/^(```|~~~)[^]*?^\1/gm, "").replace(/`[^`\n]*`/g, "");

/** Resolves a docs-local specifier to a file, or undefined for packages and aliases into other workspaces. */
function resolveLocal(specifier: string, from: string): string | undefined {
  let base: string;
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    base = resolve(dirname(from), specifier);
  } else if (
    specifier.startsWith("@/components/pages/") ||
    specifier.startsWith("@/components/demo/")
  ) {
    base = resolve(docsRoot, specifier.slice(2));
  } else {
    return undefined;
  }
  for (const candidate of [
    `${base}.tsx`,
    `${base}.ts`,
    join(base, "index.tsx"),
    join(base, "index.ts"),
  ]) {
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

const staticImports = (file: string, source = readFileSync(file, "utf8")) =>
  [...source.matchAll(STATIC_IMPORT)]
    .map((match) => resolveLocal(match[1]!, file))
    .filter((target): target is string => target !== undefined);

/** Whether loading this module statically also loads a runtime. Dynamic `import()` (a lazy boundary) is not followed. */
function buildsRuntime(file: string, seen = new Set<string>()): boolean {
  if (seen.has(file)) return false;
  seen.add(file);
  const source = readFileSync(file, "utf8");
  if (OWN_RUNTIME.test(source)) return true;
  return staticImports(file, source).some((target) =>
    buildsRuntime(target, seen),
  );
}

const mdxFiles = walk(join(docsRoot, "content"), (f) => f.endsWith(".mdx"));
const mdxImports = mdxFiles.flatMap((page) =>
  staticImports(page, stripCodeFences(readFileSync(page, "utf8"))).map(
    (target) => ({ page, target }),
  ),
);

// Pages that already imported a runtime-building sample statically when this
// test was added. Each still ships its sample to every docs page; move it
// behind `lazyComponent` and delete its line here. Nothing may be added.
const KNOWN_STATIC_RUNTIME_IMPORTS = new Set([
  "content/docs/primitives/action-bar.mdx -> components/pages/docs/samples/action-bar-primitive.tsx",
  "content/docs/primitives/branch-picker.mdx -> components/pages/docs/samples/branch-picker-primitive.tsx",
  "content/docs/primitives/chain-of-thought.mdx -> components/pages/docs/samples/chain-of-thought-primitive.radix.tsx",
  "content/docs/primitives/chain-of-thought.mdx -> components/pages/docs/samples/chain-of-thought-primitive.tsx",
  "content/docs/primitives/composer.mdx -> components/pages/docs/samples/composer-primitive.tsx",
  "content/docs/primitives/message.mdx -> components/pages/docs/samples/message-primitive.tsx",
  "content/docs/primitives/thread.mdx -> components/pages/docs/samples/thread-primitive.tsx",
  "content/docs/tools/tool-ui.mdx -> components/pages/docs/samples/tool-ui/custom-renderer.tsx",
]);

// Samples whose bare `Thread` still reaches the docs assistant from a page.
// The tools pages were out of scope when this test was added.
const KNOWN_UNSCOPED_THREADS = new Set([
  "content/docs/tools/tool-ui.mdx -> components/pages/docs/samples/tool-ui.tsx",
]);

describe("docs samples", () => {
  it("load a runtime-building sample into an MDX page only through lazyComponent", () => {
    const found = mdxImports
      .filter(({ target }) => buildsRuntime(target))
      .map(({ page, target }) => `${rel(page)} -> ${rel(target)}`);
    const added = found.filter(
      (pair) => !KNOWN_STATIC_RUNTIME_IMPORTS.has(pair),
    );
    expect(
      added,
      "Import the sample's *.lazy.tsx wrapper (lazyComponent) from the page instead",
    ).toEqual([]);
    const fixed = [...KNOWN_STATIC_RUNTIME_IMPORTS].filter(
      (pair) => !found.includes(pair),
    );
    expect(
      fixed,
      "Fixed: remove these from KNOWN_STATIC_RUNTIME_IMPORTS",
    ).toEqual([]);
  });

  it("render Thread only inside a runtime of their own or a SampleScope", () => {
    const sampleFiles = [
      ...walk(join(docsRoot, "components/pages/docs/samples"), (f) =>
        /\.tsx?$/.test(f),
      ),
      ...walk(join(docsRoot, "components/demo/elements"), (f) =>
        /\.tsx?$/.test(f),
      ),
    ].filter((f) => !/\.(test|spec)\.tsx?$/.test(f));

    const importers = new Map<string, string[]>();
    for (const file of sampleFiles)
      for (const target of staticImports(file))
        importers.set(target, [...(importers.get(target) ?? []), file]);
    for (const { page, target } of mdxImports)
      importers.set(target, [...(importers.get(target) ?? []), page]);

    const protects = (file: string) => {
      const raw = readFileSync(file, "utf8");
      // A page's code blocks show runtimes; only its rendered JSX counts.
      const source = file.endsWith(".mdx") ? stripCodeFences(raw) : raw;
      return OWN_RUNTIME.test(source) || SCOPED.test(source);
    };

    const bare = sampleFiles.filter((file) => {
      const source = readFileSync(file, "utf8");
      return RENDERS_THREAD.test(source) && !protects(file);
    });
    // A bare Thread is fine when every file that renders it provides the runtime.
    const found = bare.flatMap((file) =>
      (importers.get(file) ?? [])
        .filter((importer) => !protects(importer))
        .map((importer) => `${rel(importer)} -> ${rel(file)}`),
    );
    expect(bare.length).toBeGreaterThan(0);
    const added = found.filter((pair) => !KNOWN_UNSCOPED_THREADS.has(pair));
    expect(
      added,
      "Give the sample its own runtime (SampleRuntimeProvider, a runtime hook) or wrap it in SampleScope",
    ).toEqual([]);
    const fixed = [...KNOWN_UNSCOPED_THREADS].filter(
      (pair) => !found.includes(pair),
    );
    expect(fixed, "Fixed: remove these from KNOWN_UNSCOPED_THREADS").toEqual(
      [],
    );
  });

  it("detects a runtime behind a static import, and stops at a lazy boundary", () => {
    const samples = join(docsRoot, "components/pages/docs/samples");
    expect(buildsRuntime(join(samples, "input-history.tsx"))).toBe(true);
    expect(buildsRuntime(join(samples, "runtime-playground.tsx"))).toBe(true);
    expect(buildsRuntime(join(samples, "runtime-playground.lazy.tsx"))).toBe(
      false,
    );
  });
});
