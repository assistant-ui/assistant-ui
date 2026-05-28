import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const README_MARKER = "<!-- assistant-ui-agent-skill:start -->";
const README_SECTION = `${README_MARKER}
## AI Coding Assistants

This project includes assistant-ui guidance for AI coding assistants at \`.agents/skills/assistant-ui\`.

When asking an assistant to build or modify this app, have it read that skill first. It points to the current assistant-ui docs, CLI guidance, architecture notes, migration guidance, and common pitfalls for generated assistant-ui projects.
<!-- assistant-ui-agent-skill:end -->`;

export function installGeneratedAppAgentSkill(projectDir: string): void {
  fs.cpSync(
    resolveSkillSourceDir(),
    path.join(projectDir, ".agents", "skills", "assistant-ui"),
    {
      recursive: true,
      force: true,
    },
  );
  appendReadmeSection(projectDir);
}

function resolveSkillSourceDir(): string {
  const candidates = [
    path.resolve(__dirname, "..", "..", "plugin", "skills", "assistant-ui"),
    path.resolve(__dirname, "..", "plugin", "skills", "assistant-ui"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "SKILL.md"))) return candidate;
  }

  throw new Error(
    `Could not locate assistant-ui agent skill. Checked:\n${candidates.map((candidate) => `  ${candidate}`).join("\n")}`,
  );
}

function appendReadmeSection(projectDir: string): void {
  const readmePath = path.join(projectDir, "README.md");
  const current = fs.existsSync(readmePath)
    ? fs.readFileSync(readmePath, "utf-8")
    : "";

  if (current.includes(README_MARKER)) return;

  const prefix = current.trim().length > 0 ? `${current.trimEnd()}\n\n` : "";
  fs.writeFileSync(readmePath, `${prefix}${README_SECTION}\n`);
}
