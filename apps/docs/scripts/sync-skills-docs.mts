import { promises as fs } from "node:fs";
import path from "node:path";

const DOCS_ROOT = process.cwd();
const REPO_ROOT = path.resolve(DOCS_ROOT, "../..");
const GENERATED_HEADER =
  "<!-- Generated from apps/docs content. Do not edit directly. -->";

const CHECK_MODE = process.argv.includes("--check");

const GENERATED_REFERENCES = [
  {
    slugs: ["architecture"],
    sourcePath: "apps/docs/content/docs/(docs)/architecture.mdx",
    outputPath:
      "packages/cli/plugin/skills/assistant-ui/references/architecture.md",
  },
  {
    slugs: ["cli"],
    sourcePath: "apps/docs/content/docs/(docs)/cli.mdx",
    outputPath: "packages/cli/plugin/skills/assistant-ui/references/cli.md",
  },
] as const;

async function renderReference(config: (typeof GENERATED_REFERENCES)[number]) {
  const { sourcePath, slugs } = config;
  const content = await fs.readFile(path.join(REPO_ROOT, sourcePath), "utf-8");
  return `${GENERATED_HEADER}\n<!-- Source: ${sourcePath} -->\n\n${renderMdxAsMarkdown(content, slugs)}\n`;
}

async function syncReference(config: (typeof GENERATED_REFERENCES)[number]) {
  const outputPath = path.join(REPO_ROOT, config.outputPath);
  const nextContent = await renderReference(config);

  if (CHECK_MODE) {
    let currentContent: string;
    try {
      currentContent = await fs.readFile(outputPath, "utf-8");
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        throw new Error(`${config.outputPath} does not exist. Run sync first.`);
      }

      throw error;
    }

    if (currentContent !== nextContent) {
      throw new Error(`${config.outputPath} is stale. Run skills:sync-docs.`);
    }

    return;
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, nextContent);
}

function renderMdxAsMarkdown(content: string, slugs: readonly string[]) {
  const { frontmatter, body } = extractFrontmatter(content);
  const renderedBody = stripMdxSyntax(body);
  const lines = [
    `# ${frontmatter.title ?? titleFromSlugs(slugs)}`,
    "",
    `URL: /docs/${slugs.join("/")}`,
  ];

  if (frontmatter.description) {
    lines.push("", frontmatter.description);
  }

  lines.push("", renderedBody);
  return `${lines.join("\n").trim()}\n`;
}

function extractFrontmatter(content: string) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) return { frontmatter: {}, body: content };

  const frontmatter: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const field = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!field) continue;
    frontmatter[field[1]!] = field[2]!.replace(/^["']|["']$/g, "");
  }

  return {
    frontmatter,
    body: content.slice(match[0].length),
  };
}

function stripMdxSyntax(content: string) {
  let markdown = content
    .replace(/^import\s+.*?;?\r?\n/gm, "")
    .replace(/<div\b[^>]*>/g, "")
    .replace(/<\/div>/g, "")
    .replace(/<Cards>/g, "")
    .replace(/<\/Cards>/g, "")
    .replace(
      /^\s*<Card\s+title=['"]([^'"]+)['"]>\s*([\s\S]*?)\s*<\/Card>/gm,
      (_match, title: string, body: string) =>
        `- **${title}**: ${stripInlineMdx(body).trim()}`,
    )
    .replace(/^\s*<Card\s+([\s\S]*?)\/>/gm, (_match, attrs: string) => {
      const title = getAttribute(attrs, "title");
      const description = getAttribute(attrs, "description");
      const href = getAttribute(attrs, "href");

      if (!title) return "";
      const label = href ? `[${title}](${href})` : title;
      return `- ${label}${description ? `: ${description}` : ""}`;
    });

  markdown = stripInlineMdx(markdown);
  return markdown.replace(/\n{3,}/g, "\n\n").trim();
}

function stripInlineMdx(content: string) {
  return content.replace(/^\s*<[A-Z][^>]*>\s*$/gm, "").trim();
}

function getAttribute(attrs: string, name: string) {
  const match = attrs.match(new RegExp(`${name}=["']([^"']+)["']`));
  return match?.[1]?.replace(/â€”/g, "-");
}

function titleFromSlugs(slugs: readonly string[]) {
  return slugs
    .at(-1)!
    .split("-")
    .map((part) => `${part[0]!.toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

async function main() {
  for (const config of GENERATED_REFERENCES) {
    await syncReference(config);
  }

  console.log(
    CHECK_MODE
      ? "Skill docs references are up to date."
      : "Skill docs references synced.",
  );
}

await main();
