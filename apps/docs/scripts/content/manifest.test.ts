import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it, vi } from "vitest";
import { loader } from "fumadocs-core/source";
import { remark } from "remark";
import { createContentManifest, generateContentManifest } from "./manifest.mts";
import { createContentSource } from "../../lib/content-source";

vi.mock("remark", async (importOriginal) => {
  const original = await importOriginal<typeof import("remark")>();
  return { ...original, remark: vi.fn(() => original.remark()) };
});

function readSearchModule(source: string) {
  return JSON.parse(source);
}

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
});

it("reuses unchanged parsed content across builds and restores missing generated files", async () => {
  const root = await mkdtemp(join(tmpdir(), "aui-docs-content-"));
  roots.push(root);
  await mkdir(join(root, "content/docs"), { recursive: true });
  await writeFile(
    join(root, "content/docs/index.mdx"),
    "---\ntitle: Welcome\n---\n## Install\n\nInstall the package.",
  );

  await generateContentManifest(root);
  const generated = await readFile(join(root, ".source/content.ts"), "utf8");
  const search = await readFile(
    join(root, ".source/content-data/docs.json"),
    "utf8",
  );
  expect(remark).toHaveBeenCalledTimes(1);
  await rm(join(root, ".source"), { recursive: true });

  await generateContentManifest(root);
  expect(remark).toHaveBeenCalledTimes(1);
  expect(await readFile(join(root, ".source/content.ts"), "utf8")).toBe(
    generated,
  );
  expect(
    await readFile(join(root, ".source/content-data/docs.json"), "utf8"),
  ).toBe(search);

  await rm(join(root, ".next/cache"), { recursive: true });
  await generateContentManifest(root);
  expect(remark).toHaveBeenCalledTimes(2);
  expect(await readFile(join(root, ".source/content.ts"), "utf8")).toBe(
    generated,
  );

  await writeFile(join(root, ".next/cache/aui-content-manifest.json"), "{");
  await generateContentManifest(root);
  expect(remark).toHaveBeenCalledTimes(3);
  expect(await readFile(join(root, ".source/content.ts"), "utf8")).toBe(
    generated,
  );
});

it("invalidates cached content for edits, additions, removals and navigation changes", async () => {
  const root = await mkdtemp(join(tmpdir(), "aui-docs-content-"));
  roots.push(root);
  const directory = join(root, "content/docs");
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "index.mdx"),
    "---\ntitle: Before\n---\nOld text.",
  );
  await generateContentManifest(root);

  await writeFile(
    join(directory, "index.mdx"),
    "---\ntitle: After\n---\nNew text.",
  );
  await writeFile(
    join(directory, "next.mdx"),
    "---\ntitle: Next\n---\nNext text.",
  );
  await writeFile(
    join(directory, "meta.json"),
    JSON.stringify({ pages: ["next", "index"] }),
  );
  await generateContentManifest(root);
  expect(remark).toHaveBeenCalledTimes(2);
  const edited = await readFile(join(root, ".source/content.ts"), "utf8");
  expect(edited).toContain('"title":"After"');
  expect(edited).toContain('"pages":["next","index"]');
  expect(
    await readFile(join(root, ".source/content-data/docs.json"), "utf8"),
  ).toContain("New text.");

  await rm(join(directory, "next.mdx"));
  await generateContentManifest(root);
  expect(remark).toHaveBeenCalledTimes(3);
  expect(
    await readFile(join(root, ".source/content.ts"), "utf8"),
  ).not.toContain('import("../content/docs/next.mdx")');

  await writeFile(
    join(directory, "index.mdx"),
    "---\ntitle: [invalid]\n---\nNew text.",
  );
  await expect(generateContentManifest(root)).rejects.toThrow();
});

it("indexes authored MDX without importing bodies and refreshes added and removed pages", async () => {
  const root = await mkdtemp(join(tmpdir(), "aui-docs-content-"));
  roots.push(root);
  const directory = join(root, "content/docs/(start)");
  await mkdir(directory, { recursive: true });
  await writeFile(
    join(directory, "meta.json"),
    JSON.stringify({ title: "Start", pages: ["index"], platforms: ["vue"] }),
  );
  await writeFile(
    join(directory, "index.mdx"),
    `---
title: Welcome
platforms: [vue]
---
import Demo from "./demo";

## Install [#setup]

Install the package.
`,
  );
  const { content: generated, data } = await createContentManifest(root);
  expect(generated).toContain('import("../content/docs/(start)/index.mdx")');
  const instantiate = new Function(
    "createContentSource",
    generated
      .replace(/^import[^\n]+\n/, "")
      .replaceAll("export const ", "const ") + "\nreturn docs;",
  );
  const source = loader({
    baseUrl: "/docs",
    source: instantiate(createContentSource) as ReturnType<
      typeof createContentSource<"docs">
    >,
  });
  const page = source.getPage([])!;
  expect(page.data.title).toBe("Welcome");
  expect(page.data.platforms).toEqual(["vue"]);
  expect(
    readSearchModule(data.docs!)["(start)/index.mdx"]!.structured,
  ).toMatchObject({
    headings: [{ id: "setup", content: "Install" }],
    contents: [{ content: "Install the package." }],
  });

  await rm(join(directory, "index.mdx"));
  await writeFile(
    join(directory, "new.mdx"),
    "---\ntitle: New page\n---\nNew content.",
  );
  const { content: refreshed } = await createContentManifest(root);
  expect(refreshed).not.toContain(
    'import("../content/docs/(start)/index.mdx")',
  );
  expect(refreshed).toContain('import("../content/docs/(start)/new.mdx")');
});

it("escapes source literals while preserving authored metadata and filenames", async () => {
  const root = await mkdtemp(join(tmpdir(), "aui-docs-content-"));
  roots.push(root);
  const directory = join(root, "content/docs");
  await mkdir(directory, { recursive: true });
  const filename = "quote'\u2028\u2029.mdx";
  const title =
    'Quotes " and \\ with </script><script> and separators \u2028\u2029';
  await writeFile(
    join(directory, filename),
    `---\ntitle: ${JSON.stringify(title)}\n---\n\n## Literal markup\n\nUse \`</script><script>\` as text.\n`,
  );

  const { content, data } = await createContentManifest(root);
  expect(content).not.toContain("</script>");
  expect(content).not.toMatch(/[\u2028\u2029]/u);
  expect(content).toContain("\\u003c/script\\u003e\\u003cscript\\u003e");
  expect(content).toContain(
    'import("../content/docs/quote\'\\u2028\\u2029.mdx")',
  );
  const instantiate = new Function(
    "createContentSource",
    content
      .replace(/^import[^\n]+\n/, "")
      .replaceAll("export const ", "const ") + "\nreturn docs;",
  );
  const source = instantiate(createContentSource) as ReturnType<
    typeof createContentSource<"docs">
  >;
  expect(source.files).toContainEqual(
    expect.objectContaining({
      path: filename,
      data: expect.objectContaining({ title }),
    }),
  );
  expect(data.docs).not.toContain("</script>");
  expect(data.docs).not.toMatch(/[\u2028\u2029]/u);
  const search = readSearchModule(data.docs!);
  expect(search[filename]!.structured.contents).toEqual([
    { heading: "literal-markup", content: "Use `</script><script>` as text." },
  ]);
});
