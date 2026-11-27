import { agentSetupPrompt } from "@/lib/agent-setup-prompt";
import type { LibrarySkill } from "./skills-data";
import {
  STARTERS,
  starterCommand,
  starterId,
  type Starter,
} from "./starters-data";

/** What the saved panel draws beside an item. */
export type LibrarySavedPreview =
  | { kind: "starter"; starter: Starter }
  | { kind: "skill"; skill: string };

/** The kinds of thing the library holds; each has its own color. */
export type LibraryKind = "template" | "example" | "skill";

export const LIBRARY_KIND_LABEL: Record<LibraryKind, string> = {
  template: "Template",
  example: "Example",
  skill: "Skill",
};

export type LibrarySavedItem = {
  id: string;
  name: string;
  /** What kind of item it is, shown under its name. */
  kind: LibraryKind;
  command: string;
  /** How the item is named in an agent prompt. */
  promptName: string;
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

const STARTER_ITEMS = STARTERS.map(fromStarter);

/**
 * The saved items in the order they were added; ids no longer in the library
 * are dropped. `more` holds the items the server reads for the page, such as
 * skills.
 */
export const getLibrarySavedItems = (
  ids: readonly string[],
  more: readonly LibrarySavedItem[] = [],
): LibrarySavedItem[] => {
  const items = new Map(
    [...STARTER_ITEMS, ...more].map((item) => [item.id, item] as const),
  );
  return ids.flatMap((id) => {
    const item = items.get(id);
    return item ? [item] : [];
  });
};

export const librarySavedPrompt = (
  items: readonly LibrarySavedItem[],
): string => {
  const starters = items.filter((item) => item.preview.kind === "starter");
  const skills = items.filter((item) => item.preview.kind === "skill");

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
  if (starters.length === 0) return skillsNote;

  const startersNote =
    starters.length === 1
      ? `Start from ${starters[0]!.promptName}`
      : `Create one project from each of these: ${starters
          .map((item) => `${item.promptName} (\`${item.command}\`)`)
          .join(", ")}`;
  return agentSetupPrompt(
    [],
    skillsNote ? `${startersNote}. ${skillsNote}` : startersNote,
  );
};
