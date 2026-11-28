import { LIBRARY_SITE, agentSetupPrompt } from "./agent-prompt";
import { LIBRARY_SECTIONS, type LibrarySectionId } from "./library-data";
import { LIBRARY_SKILLS, type LibrarySkill } from "./skills-data";
import {
  STARTERS,
  starterCommand,
  starterId,
  type Starter,
} from "./starters-data";

/** What the saved panel draws beside an item. */
export type LibrarySavedPreview =
  | { kind: "starter"; starter: Starter }
  | { kind: "skill"; skill: string }
  | { kind: "block"; image: { light: string; dark: string } }
  | { kind: "section"; section: LibrarySectionId };

/** The kinds of thing the library holds; each has its own color. */
export type LibraryKind =
  | "template"
  | "example"
  | "skill"
  | "component"
  | "block"
  | "runtime"
  | "tool"
  | "integration"
  | "utility"
  | "editor";

export const LIBRARY_KIND_LABEL: Record<LibraryKind, string> = {
  template: "Template",
  example: "Example",
  skill: "Skill",
  component: "Component",
  block: "Block",
  runtime: "Runtime",
  tool: "Tool",
  integration: "Integration",
  utility: "Utility",
  editor: "MCP setup",
};

export type LibrarySavedItem = {
  id: string;
  name: string;
  /** What kind of item it is, shown under its name. */
  kind: LibraryKind;
  /** Absent when the item is set up by following its page. */
  command?: string;
  /** How the item is named in an agent prompt. */
  promptName: string;
  /** The item's page, which an agent follows when there is no command. */
  href?: string;
  preview: LibrarySavedPreview;
};

const fromStarter = (starter: Starter): LibrarySavedItem => ({
  id: starterId(starter),
  name: starter.label,
  kind: starter.kind,
  command: starterCommand(starter),
  promptName: `the \`${starter.name}\` ${starter.kind}`,
  preview: { kind: "starter", starter },
});

export const skillSavedId = (name: string) => `skills/${name}`;

export const savedSkillItem = (
  skill: Pick<LibrarySkill, "name" | "title" | "command">,
): LibrarySavedItem => ({
  id: skillSavedId(skill.name),
  name: skill.title,
  kind: "skill",
  command: skill.command,
  promptName: `the \`${skill.name}\` skill`,
  preview: { kind: "skill", skill: skill.name },
});

/** The kind an item saved from each tab is; starters and skills name their own. */
const SECTION_KIND: Partial<Record<LibrarySectionId, LibraryKind>> = {
  components: "component",
  blocks: "block",
  runtimes: "runtime",
  tools: "tool",
  integrations: "integration",
  utilities: "utility",
  mcp: "editor",
};

const absolute = (href: string) =>
  href.startsWith("/") ? `${LIBRARY_SITE}${href}` : href;

const fromSections = (): LibrarySavedItem[] =>
  LIBRARY_SECTIONS.flatMap((section) => {
    const kind = SECTION_KIND[section.id];
    if (!kind) return [];
    const label = LIBRARY_KIND_LABEL[kind].toLowerCase();
    return section.groups.flatMap((group) =>
      group.entries.flatMap((entry): LibrarySavedItem[] => {
        if (entry.kind === "block") {
          return [
            {
              id: blockSavedId(entry.block.slug),
              name: entry.block.title,
              kind,
              promptName: `the ${entry.block.title} block`,
              href: absolute(`/blocks/${entry.block.slug}`),
              preview: { kind: "block", image: entry.block.image },
            },
          ];
        }
        if (entry.kind !== "link" || !entry.link.id) return [];
        const { id, name, command, href } = entry.link;
        return [
          {
            id,
            name,
            kind,
            ...(command && { command }),
            promptName:
              kind === "editor"
                ? `the MCP server in ${name}`
                : `${name} (${label})`,
            href: absolute(href),
            preview: { kind: "section", section: section.id },
          },
        ];
      }),
    );
  });

export const blockSavedId = (slug: string) => `blocks/${slug}`;

const ALL_ITEMS = new Map(
  [
    ...STARTERS.map(fromStarter),
    ...LIBRARY_SKILLS.map(savedSkillItem),
    ...fromSections(),
  ].map((item) => [item.id, item] as const),
);

/** The saved items in the order they were added; ids no longer in the library are dropped. */
export const getLibrarySavedItems = (
  ids: readonly string[],
): LibrarySavedItem[] =>
  ids.flatMap((id) => {
    const item = ALL_ITEMS.get(id);
    return item ? [item] : [];
  });

export const librarySavedPrompt = (
  items: readonly LibrarySavedItem[],
): string => {
  const starters = items.filter((item) => item.preview.kind === "starter");
  const skills = items.filter((item) => item.preview.kind === "skill");
  const others = items.filter(
    (item) => item.preview.kind !== "starter" && item.preview.kind !== "skill",
  );

  const skillsNote =
    skills.length === 0
      ? ""
      : `Install ${
          skills.length === 1
            ? "this assistant-ui skill"
            : "these assistant-ui skills"
        } for your coding agent: ${skills
          .map((item) => `\`${item.command}\``)
          .join(", ")}`;
  if (starters.length === 0 && others.length === 0) return skillsNote;

  const startersNote =
    starters.length === 0
      ? ""
      : starters.length === 1
        ? `Start from ${starters[0]!.promptName}`
        : `Create one project from each of these: ${starters
            .map((item) => `${item.promptName} (\`${item.command}\`)`)
            .join(", ")}`;
  const othersNote =
    others.length === 0
      ? ""
      : `Add ${others
          .map(
            (item) =>
              `${item.promptName} (${item.command ? `\`${item.command}\`` : item.href})`,
          )
          .join(", ")}`;
  return agentSetupPrompt(
    [],
    [startersNote, othersNote, skillsNote].filter(Boolean).join(". "),
  );
};
