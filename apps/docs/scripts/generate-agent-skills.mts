import { promises as fs } from "node:fs";
import path from "node:path";

const REPO = "assistant-ui/skills";
// The published skills are reviewed content, so the source is a commit this
// repo chose rather than whatever the upstream branch holds at build time.
// Bump it by PR and regenerate the snapshot in the same change.
const COMMIT = "da44b9dbf6d309942a1bd8ea2a58c82716e5c48d";
const SKILLS_DIR = "assistant-ui/skills";
const API_BASE = `https://api.github.com/repos/${REPO}`;
const rawSkillUrl = (commit: string, name: string) =>
  `https://raw.githubusercontent.com/${REPO}/${commit}/${SKILLS_DIR}/${name}/SKILL.md`;
const OUTPUT_PATH = path.join(
  process.cwd(),
  "lib",
  "agent-skills.generated.json",
);
const FETCH_TIMEOUT_MS = 15_000;

type GeneratedSkill = { name: string; description: string; content: string };

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "assistant-ui-docs",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function fetchText(url: string, headers?: Record<string, string>) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }
  return response.text();
}

async function listSkillDirectories() {
  const tree = JSON.parse(
    await fetchText(
      `${API_BASE}/git/trees/${COMMIT}?recursive=1`,
      githubHeaders(),
    ),
  ) as { tree: { path: string }[] };
  const pattern = new RegExp(`^${SKILLS_DIR}/([^/]+)/SKILL\\.md$`);
  const names = tree.tree
    .map((entry) => pattern.exec(entry.path)?.[1])
    .filter((name): name is string => name !== undefined)
    .sort();
  if (names.length === 0) {
    throw new Error(`no ${SKILLS_DIR}/*/SKILL.md entries in ${REPO}`);
  }
  return names;
}

function parseFrontmatter(markdown: string, name: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown);
  if (!match) throw new Error(`${name}/SKILL.md has no frontmatter`);
  const fields: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith("#")) continue;
    const field = /^([\w-]+):(.*)$/.exec(line);
    const raw = field?.[2]?.trim() ?? "";
    if (!field || /^['>|[{&*!%@`]/.test(raw)) {
      throw new Error(
        `${name}/SKILL.md has frontmatter this generator cannot read: ${line}`,
      );
    }
    fields[field[1]!] = raw.startsWith('"') ? (JSON.parse(raw) as string) : raw;
  }
  return { fields, body: markdown.slice(match[0].length).trim() };
}

// Skills link to their reference files and to sibling skills relatively;
// served out of the docs site those paths resolve nowhere, so they are
// pointed back at the source repo.
function absolutizeRelativeLinks(text: string, name: string, commit: string) {
  const base = rawSkillUrl(commit, name);
  return text.replaceAll(
    /\]\((\.\.?\/[^)\s]+)\)/g,
    (_, target: string) => `](${new URL(target, base).href})`,
  );
}

async function fetchSkill(
  name: string,
  commit: string,
): Promise<GeneratedSkill> {
  const markdown = await fetchText(rawSkillUrl(commit, name));
  const { fields, body } = parseFrontmatter(markdown, name);
  if (fields.name !== name) {
    throw new Error(`${name}/SKILL.md declares name ${fields.name ?? "none"}`);
  }
  if (!fields.description) {
    throw new Error(`${name}/SKILL.md has no description`);
  }
  return {
    name,
    description: absolutizeRelativeLinks(fields.description, name, commit),
    content: absolutizeRelativeLinks(body, name, commit),
  };
}

async function main() {
  const names = await listSkillDirectories();
  const skills = await Promise.all(
    names.map((name) => fetchSkill(name, COMMIT)),
  );
  await fs.writeFile(
    OUTPUT_PATH,
    `${JSON.stringify({ source: `${REPO}@${COMMIT}`, skills }, null, 2)}\n`,
  );
  console.log(
    `Wrote ${skills.length} agent skills from ${REPO}@${COMMIT.slice(0, 7)} to ${path.relative(process.cwd(), OUTPUT_PATH)}`,
  );
}

await main();
