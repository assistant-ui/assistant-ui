import generated from "@/lib/agent-skills.generated.json";
import { getSkills, type AgentSkill } from "@/lib/agent-skills";
import {
  SKILL_GROUPS,
  SKILL_CATALOG,
  SKILLS_COMMAND,
  SKILLS_REPO,
  SKILLS_REPO_HREF,
  type LibrarySkill,
} from "./skills-data";

const GROUP_ORDER = SKILL_GROUPS.map((group) => group.id);
const SKILL_ORDER = Object.keys(SKILL_CATALOG);

const rank = (order: readonly string[], value: string) => {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
};

const HOUSEKEEPING = new Set(["Contents", "References", "Related Skills"]);

const plainLinks = (text: string) =>
  text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

const summaryOf = (description: string) => {
  const end = description.search(/[.:] /);
  return end === -1 ? description : description.slice(0, end);
};

const sectionBody = (content: string, heading: string) => {
  const start = content.indexOf(`\n## ${heading}\n`);
  if (start === -1) return "";
  const from = start + heading.length + 5;
  const next = content.indexOf("\n## ", from);
  return content.slice(from, next === -1 ? undefined : next);
};

const toLibrarySkill = (skill: AgentSkill, commit: string): LibrarySkill => {
  const { name, content } = skill;
  const command = `${SKILLS_COMMAND} --skill ${name}`;
  const description = plainLinks(skill.description);
  const heading = /^# (.+)$/m.exec(content)?.[1] ?? name;
  const title = heading.replace(/^assistant-ui (?=\S)/, "");
  const references = [
    ...sectionBody(content, "References").matchAll(
      /^- \[([^\]]+)\]\(([^)]+)\)/gm,
    ),
  ].map((match) => {
    const file = match[1]!.replace(/^\.\/references\//, "");
    const href = match[2]!;
    return {
      file,
      href,
      path: href.split(`/skills/${name}/`)[1] ?? `references/${file}`,
    };
  });

  return {
    name,
    title,
    summary: SKILL_CATALOG[name]?.summary ?? summaryOf(description),
    description,
    group: SKILL_CATALOG[name]?.group ?? GROUP_ORDER.at(-1)!,
    sections: [...content.matchAll(/^## (.+)$/gm)]
      .map((match) => match[1]!)
      .filter((section) => !HOUSEKEEPING.has(section)),
    references,
    command,
    prompt: `Install the assistant-ui \`${name}\` skill with \`${command}\``,
    slash: `/${name}`,
    rawHref: `/.well-known/agent-skills/${name}/SKILL.md`,
    sourceFileHref: `https://raw.githubusercontent.com/${SKILLS_REPO}/${commit}/assistant-ui/skills/${name}/SKILL.md`,
    sourceHref: `${SKILLS_REPO_HREF}/tree/${commit}/assistant-ui/skills/${name}`,
  };
};

export const getLibrarySkills = (): LibrarySkill[] => {
  const skills = getSkills();
  const commit =
    (generated as { source: string }).source.split("@")[1] ?? "main";
  return skills
    .map((skill) => toLibrarySkill(skill, commit))
    .sort(
      (a, b) =>
        rank(GROUP_ORDER, a.group) - rank(GROUP_ORDER, b.group) ||
        rank(SKILL_ORDER, a.name) - rank(SKILL_ORDER, b.name),
    );
};
