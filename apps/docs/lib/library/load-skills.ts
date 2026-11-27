import generated from "@/lib/agent-skills.generated.json";
import { getSkills, type AgentSkill } from "@/lib/agent-skills";
import {
  SKILL_GROUPS,
  SKILL_CATALOG,
  SKILLS_COMMAND,
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

const toLibrarySkill = (
  skill: AgentSkill,
  names: ReadonlySet<string>,
  commit: string,
): LibrarySkill => {
  const { name, content } = skill;
  const command = `${SKILLS_COMMAND} --skill ${name}`;
  const description = plainLinks(skill.description);
  const heading = /^# (.+)$/m.exec(content)?.[1] ?? name;
  const title = heading.replace(/^assistant-ui (?=\S)/, "");
  const intro =
    content
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .find((block) => block && !/^(#|\*\*Always consult)/.test(block)) ?? "";

  const references = [
    ...sectionBody(content, "References").matchAll(
      /^- \[([^\]]+)\]\([^)]+\)(?: -- (.+))?$/gm,
    ),
  ].map((match) => ({
    file: match[1]!.replace(/^\.\/references\//, ""),
    note: plainLinks(match[2] ?? ""),
  }));

  const related = [
    ...new Set(
      [
        ...sectionBody(content, "Related Skills").matchAll(
          /\/skills\/([a-z0-9-]+)\/SKILL\.md/g,
        ),
      ]
        .map((match) => match[1]!)
        .filter((other) => other !== name && names.has(other)),
    ),
  ];

  return {
    name,
    title,
    summary: SKILL_CATALOG[name]?.summary ?? summaryOf(description),
    description,
    intro: plainLinks(intro),
    group: SKILL_CATALOG[name]?.group ?? GROUP_ORDER.at(-1)!,
    sections: [...content.matchAll(/^## (.+)$/gm)]
      .map((match) => match[1]!)
      .filter((section) => !HOUSEKEEPING.has(section)),
    references,
    related,
    command,
    prompt: `Install the assistant-ui \`${name}\` skill with \`${command}\``,
    slash: `/${name}`,
    rawHref: `/.well-known/agent-skills/${name}/SKILL.md`,
    sourceHref: `${SKILLS_REPO_HREF}/tree/${commit}/assistant-ui/skills/${name}`,
  };
};

export const getLibrarySkills = (): LibrarySkill[] => {
  const skills = getSkills();
  const names = new Set(skills.map((skill) => skill.name));
  const commit =
    (generated as { source: string }).source.split("@")[1] ?? "main";
  return skills
    .map((skill) => toLibrarySkill(skill, names, commit))
    .sort(
      (a, b) =>
        rank(GROUP_ORDER, a.group) - rank(GROUP_ORDER, b.group) ||
        rank(SKILL_ORDER, a.name) - rank(SKILL_ORDER, b.name),
    );
};
