import { promises as fs } from "node:fs";
import path from "node:path";

const REPO = "assistant-ui/skills";
const BRANCH = "main";
const SKILLS_DIR = "assistant-ui/skills";
const API_BASE = `https://api.github.com/repos/${REPO}`;
const rawSkillUrl = (commit: string, name: string, file: string) =>
  `https://raw.githubusercontent.com/${REPO}/${commit}/${SKILLS_DIR}/${name}/${file}`;
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

// Everything is read at one commit so the skills, their reference links, and
// the recorded source cannot straddle a push to the branch.
async function listSkillDirectories() {
  const { sha: commit } = JSON.parse(
    await fetchText(`${API_BASE}/commits/${BRANCH}`, githubHeaders()),
  ) as { sha: string };
  const tree = JSON.parse(
    await fetchText(
      `${API_BASE}/git/trees/${commit}?recursive=1`,
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
  return { commit, names };
}

function parseFrontmatter(markdown: string) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(markdown);
  if (!match) throw new Error("missing frontmatter");
  const fields: Record<string, string> = {};
  for (const line of match[1]!.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const raw = line.slice(separator + 1).trim();
    fields[key] = raw.startsWith('"') ? (JSON.parse(raw) as string) : raw;
  }
  return { fields, body: markdown.slice(match[0].length).trim() };
}

// Skills link to their sibling reference files relatively; served out of
// the docs site those paths resolve nowhere, so they are pointed back at the
// source repo.
function absolutizeReferenceLinks(body: string, name: string, commit: string) {
  return body.replaceAll(
    /\]\(\.\/([^)\s]+)\)/g,
    (_, target: string) => `](${rawSkillUrl(commit, name, target)})`,
  );
}

async function fetchSkill(
  name: string,
  commit: string,
): Promise<GeneratedSkill> {
  const markdown = await fetchText(rawSkillUrl(commit, name, "SKILL.md"));
  const { fields, body } = parseFrontmatter(markdown);
  if (fields.name !== name) {
    throw new Error(`${name}/SKILL.md declares name ${fields.name ?? "none"}`);
  }
  if (!fields.description) {
    throw new Error(`${name}/SKILL.md has no description`);
  }
  return {
    name,
    description: fields.description,
    content: absolutizeReferenceLinks(body, name, commit),
  };
}

async function main() {
  const { commit, names } = await listSkillDirectories();
  const skills = await Promise.all(
    names.map((name) => fetchSkill(name, commit)),
  );
  await fs.writeFile(
    OUTPUT_PATH,
    `${JSON.stringify({ source: `${REPO}@${commit}`, skills }, null, 2)}\n`,
  );
  console.log(
    `Wrote ${skills.length} agent skills from ${REPO}@${commit.slice(0, 7)} to ${path.relative(process.cwd(), OUTPUT_PATH)}`,
  );
}

main().catch(async (error) => {
  const existing = await fs.stat(OUTPUT_PATH).catch(() => undefined);
  // A build must not go down with GitHub; the committed copy stays in place
  // and only goes stale.
  if (existing) {
    console.warn(
      `Keeping the committed agent skills: refresh failed (${error instanceof Error ? error.message : String(error)})`,
    );
    return;
  }
  console.error(error);
  process.exitCode = 1;
});
