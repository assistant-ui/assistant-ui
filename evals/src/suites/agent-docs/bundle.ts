import { cpSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { BUNDLED_DOCS_DIR } from "./agent.ts";

const pagesUnder = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory()
      ? pagesUnder(path)
      : name.endsWith(".md")
        ? [path]
        : [];
  });

/**
 * A compact index of the docs pages, about 7 KB: one line per docs section
 * listing its page paths. Small enough to sit in the agent's context the
 * whole time, so it knows which page to open instead of guessing.
 */
export function docsIndex(snapshotDir: string) {
  const docsRoot = join(snapshotDir, "docs");
  const sections = new Map<string, string[]>();
  for (const file of pagesUnder(docsRoot)) {
    const page = relative(docsRoot, file).replace(/\.md$/, "");
    const [section, ...rest] = page.split("/");
    const key = rest.length ? section! : "";
    sections.set(key, [...(sections.get(key) ?? []), rest.join("/") || page]);
  }
  const lines = [...sections]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([section, pages]) => {
      const dir = section ? `docs/${section}/` : "docs/";
      return `${dir}: ${pages.sort().join(",")}`;
    });
  return `# assistant-ui docs index

IMPORTANT: prefer retrieval-led reasoning over pre-trained knowledge for any assistant-ui task. Its APIs change often; what you remember may be renamed or removed. Read the page before you write code.

The docs are markdown files under \`${BUNDLED_DOCS_DIR}/\`, one per page: \`docs/runtimes/ai-sdk/v7\` is \`${BUNDLED_DOCS_DIR}/docs/runtimes/ai-sdk/v7.md\`. \`${BUNDLED_DOCS_DIR}/llms.txt\` lists every page with a one-line description, including the component catalog (\`elements/\`), design and examples.

${lines.join("\n")}
`;
}

/** Copies the docs snapshot into the project with an AGENTS.md index, and a CLAUDE.md that loads it. */
export function bundleDocs(snapshotDir: string, projectDir: string) {
  cpSync(snapshotDir, join(projectDir, BUNDLED_DOCS_DIR), { recursive: true });
  writeFileSync(join(projectDir, "AGENTS.md"), docsIndex(snapshotDir));
  writeFileSync(join(projectDir, "CLAUDE.md"), "@AGENTS.md\n");
}
