import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { loader } from "fumadocs-core/source";
import { createContentManifest } from "./manifest.mts";
import { createContentSource } from "../../lib/content-source";

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true })),
  );
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
    JSON.parse(data.docs!.replace(/^export default /, "").replace(/;\n$/, ""))[
      "(start)/index.mdx"
    ].structured,
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
