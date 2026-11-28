import { agentSetupPrompt } from "./agent-prompt";
import { LIBRARY_BLOCKS, type LibraryBlock } from "./blocks-data";
import {
  LIBRARY_ELEMENTS,
  LIBRARY_FEATURES,
  LIBRARY_TRAITS,
  LIBRARY_UI_COMPONENTS,
  LIBRARY_VOCABULARY,
} from "./components-data";
import {
  LIBRARY_INTEGRATIONS,
  LIBRARY_PRIMITIVES,
  LIBRARY_RUNTIMES,
  LIBRARY_UTILITIES,
  type LibraryPageGroup,
} from "./docs-data";
import { LIBRARY_MARKS } from "./marks";
import { MCP_COMMAND, MCP_EDITORS, MCP_URL } from "./mcp-data";
import {
  LIBRARY_PRESETS,
  presetCommand,
  presetPrompt,
  type LibraryPreset,
} from "./presets-data";
import { SKILL_AGENTS } from "./skill-agents";
import {
  LIBRARY_SKILLS,
  SKILLS_COMMAND,
  SKILLS_COMMAND_STEPS,
  SKILL_GROUPS,
  matchesSkill,
  type LibrarySkill,
} from "./skills-data";
import {
  EXAMPLES,
  PLAYGROUND,
  TEMPLATES,
  starterCommand,
  starterPrompt,
  type Starter,
} from "./starters-data";

export type LibrarySectionId =
  | "components"
  | "blocks"
  | "starters"
  | "runtimes"
  | "integrations"
  | "utilities"
  | "skills"
  | "agents"
  | "mcp";

/** An item that has its own page, shown as a link to it. */
export type LibraryLink = {
  name: string;
  description: string;
  href: string;
  /** Set when the description is a command, so it is set in the code face. */
  code?: boolean;
  /** What is drawn before the name, as a key `LibraryMark` reads. */
  mark?: string;
  /** The section's `traits` this item has. */
  traits?: readonly string[];
  /** Its id in the saved panel; an item without one cannot be saved or copied. */
  id?: string;
  /** Absent when the item is set up by following its page. */
  command?: string;
  /** What to tell a coding agent to add it. */
  prompt?: string;
  /** The item's docs page, when `href` is somewhere else. */
  docs?: string;
};

export type LibraryEntry =
  | { kind: "link"; link: LibraryLink }
  | { kind: "block"; block: LibraryBlock }
  | { kind: "starter"; starter: Starter }
  | { kind: "preset"; preset: LibraryPreset }
  | { kind: "skill"; skill: LibrarySkill };

/** An entry the starters' drawer opens: a starter or a preset. */
export type StarterEntry = Extract<
  LibraryEntry,
  { kind: "starter" | "preset" }
>;

export type LibraryGroup = {
  label: string;
  entries: readonly LibraryEntry[];
};

/** One command a stepping install command shows: what follows the base, and what it does. */
export type LibraryCommandStep = {
  rest: string;
  does: string;
  /** What to tell a coding agent in place of the command; left out when saying what it does and the command is enough. */
  prompt?: string;
};

export type LibraryCommands = {
  base: string;
  steps: readonly LibraryCommandStep[];
};

export type LibrarySection = {
  id: LibrarySectionId;
  title: string;
  /** What its items are called, as in "Search starters". */
  noun: string;
  description: string;
  /** The install command in the hero, which steps through its items; absent when nothing installs by command. */
  commands?: LibraryCommands;
  href: string;
  /** The link beside the install command that says where to read more. */
  guide: string;
  /** The skills that teach a coding agent this tab's subject, by name; each opens from a button in the hero. */
  skills?: readonly string[];
  groups: readonly LibraryGroup[];
  /** Things only some of its items are, each offered as a filter. */
  traits?: readonly { id: string; label: string }[];
};

const links = (items: readonly LibraryLink[]): LibraryEntry[] =>
  items.map((link) => ({ kind: "link", link }));

/** Tabs whose every row leads with a mark; an item with no key of its own shows its first letter. */
const MARKED: readonly string[] = ["runtimes", "integrations", "utilities"];

const marked = (section: string, id: string, name: string) =>
  LIBRARY_MARKS[id] ??
  (MARKED.includes(section) ? `letter:${name}` : undefined);

const pages = (
  section: LibrarySectionId | "primitives",
  groups: readonly LibraryPageGroup[],
): LibraryGroup[] =>
  groups.map((group) => ({
    label: group.label,
    entries: links(
      group.pages.map(({ slug, ...page }) => {
        const id = `${section}/${slug}`;
        const mark = marked(section, id, page.name);
        return { ...page, id, ...(mark && { mark }) };
      }),
    ),
  }));

const SHADCN_ADD = "npx shadcn@latest add";

const SKILLS_GUIDE = "/docs/llm#skills";

const route = (
  item: string,
  link: Pick<LibraryLink, "name" | "description" | "href">,
): LibraryLink => {
  const command = `${SHADCN_ADD} @assistant-ui/${item}`;
  return {
    ...link,
    id: `routes/${item}`,
    command,
    prompt: agentSetupPrompt([], `Add the ${link.name} with \`${command}\``),
  };
};

/** What the All tab's install command steps through: the CLI's own commands. */
export const LIBRARY_COMMANDS: LibraryCommands = {
  base: "npx assistant-ui@latest",
  steps: [
    { rest: "init", does: "Add assistant-ui to an existing project" },
    { rest: "create my-app", does: "Start a new project" },
    { rest: "add thread", does: "Add a component" },
    { rest: "setup", does: "Set up with a coding agent" },
    { rest: "mcp", does: "Connect your editor to the docs" },
  ],
};

export const LIBRARY_GUIDE = { label: "Read the CLI guide", href: "/docs/cli" };

/** The skill the All tab offers: the overview that says which skill to use. */
export const LIBRARY_HOME_SKILLS: readonly string[] = ["assistant-ui"];

const starters = (items: readonly Starter[]): LibraryEntry[] =>
  items.map((starter) => ({ kind: "starter", starter }));

const STARTERS_COMMAND = "npx assistant-ui@latest create my-app";

const SECTIONS: readonly Omit<LibrarySection, "commands">[] = [
  {
    id: "components",
    title: "Components",
    noun: "components",
    description:
      "Chat elements, UI components, primitives, and the parts a model can write.",
    href: "/components",
    guide: "Open the components page",
    skills: ["elements", "primitives"],
    traits: LIBRARY_TRAITS,
    groups: [
      {
        label: "Elements",
        entries: links(
          LIBRARY_ELEMENTS.map(({ slug, ...element }) => ({
            ...element,
            id: `components/${slug}`,
            href: `/elements/${slug}`,
          })),
        ),
      },
      {
        label: "UI",
        entries: links(
          LIBRARY_UI_COMPONENTS.map(({ slug, ...component }) => ({
            ...component,
            id: `ui/${slug}`,
            href: `/design/components/${slug}`,
          })),
        ),
      },
      ...pages("primitives", LIBRARY_PRIMITIVES),
      {
        label: "Vocabulary",
        entries: links(
          LIBRARY_VOCABULARY.flatMap((category) =>
            category.components.map((component) => ({
              name: component.name,
              description: component.description,
              href: `/elements/vocabulary#${component.name}`,
            })),
          ),
        ),
      },
      {
        label: "Features",
        entries: links(
          LIBRARY_FEATURES.map(({ slug, ...feature }) => ({
            ...feature,
            id: `features/${slug}`,
          })),
        ),
      },
      {
        label: "Routes and pages",
        entries: links([
          route("ai-sdk-backend", {
            name: "AI SDK backend",
            description:
              "A Next.js route handler that streams chat completions through the AI SDK.",
            href: "/docs/runtimes/ai-sdk/overview",
          }),
          route("ai-sdk-backend-resumable", {
            name: "AI SDK resumable backend",
            description:
              "AI SDK route handlers with a resumable stream, so a run survives a reload.",
            href: "/docs/runtimes/resumable-streams",
          }),
          route("eve-chat", {
            name: "Eve chat",
            description:
              "A chat page for an Eve agent, drawn through an assistant-ui thread.",
            href: "/docs/runtimes/eve/overview",
          }),
        ]),
      },
    ],
  },
  {
    id: "blocks",
    title: "Blocks",
    noun: "blocks",
    description: "Whole app surfaces with an assistant built in.",
    href: "/blocks",
    guide: "Open the blocks page",
    skills: ["copilots"],
    groups: [
      {
        label: "Blocks",
        entries: LIBRARY_BLOCKS.map((block) => ({ kind: "block", block })),
      },
    ],
  },
  {
    id: "starters",
    title: "Starters",
    noun: "starters",
    description:
      "Templates, example apps, playground templates, and presets that start a new project.",
    href: "/docs/cli#create",
    guide: "Read the CLI guide",
    skills: ["setup"],
    groups: [
      { label: "Templates", entries: starters(TEMPLATES) },
      { label: "Examples", entries: starters(EXAMPLES) },
      { label: "Playground", entries: starters(PLAYGROUND) },
      {
        label: "Presets",
        entries: LIBRARY_PRESETS.map((preset) => ({ kind: "preset", preset })),
      },
    ],
  },
  {
    id: "runtimes",
    title: "Runtimes",
    noun: "runtimes",
    description: "Adapters that connect the chat to a backend.",
    href: "/docs/runtimes/pick-a-runtime",
    guide: "Pick a runtime",
    skills: ["runtime", "streaming"],
    groups: pages("runtimes", LIBRARY_RUNTIMES),
  },
  {
    id: "integrations",
    title: "Integrations",
    noun: "integrations",
    description: "Gateways, observability, auth, persistence, and attachments.",
    href: "/docs/integrations",
    guide: "Read the integrations guide",
    skills: ["cloud", "observability"],
    groups: pages("integrations", LIBRARY_INTEGRATIONS),
  },
  {
    id: "utilities",
    title: "Utilities",
    noun: "utilities",
    description: "Standalone packages that work without assistant-ui.",
    href: "/docs/utilities/heat-graph",
    guide: "Read the utilities docs",
    groups: pages("utilities", LIBRARY_UTILITIES),
  },
  {
    id: "skills",
    title: "Skills",
    noun: "skills",
    description:
      "Instructions a coding agent loads to build with assistant-ui.",
    href: SKILLS_GUIDE,
    guide: "Read the skills guide",
    skills: ["assistant-ui"],
    groups: SKILL_GROUPS.map((group) => ({
      label: group.title,
      entries: LIBRARY_SKILLS.filter((skill) => skill.group === group.id).map(
        (skill): LibraryEntry => ({ kind: "skill", skill }),
      ),
    })).filter((group) => group.entries.length > 0),
  },
  {
    id: "agents",
    title: "Agents",
    noun: "agents",
    description:
      "Coding agents the skills install into, each in its own folder.",
    href: SKILLS_GUIDE,
    guide: "Read the skills guide",
    groups: [
      {
        label: "Agents",
        entries: links(
          SKILL_AGENTS.map((agent) => {
            const command = `${SKILLS_COMMAND} -a ${agent.slug}`;
            return {
              name: agent.name,
              description: agent.directory,
              href: SKILLS_GUIDE,
              code: true,
              mark: `agent:${agent.slug}`,
              id: `agents/${agent.slug}`,
              command,
              prompt: `Install the assistant-ui skills for ${agent.name} with \`${command}\``,
            };
          }),
        ),
      },
    ],
  },
  {
    id: "mcp",
    title: "MCP server",
    noun: "editors",
    description:
      "Connects your editor's agent to the assistant-ui docs and examples.",
    href: "/library/mcp",
    guide: "See the setup steps",
    groups: [
      {
        label: "Editors",
        entries: links(
          MCP_EDITORS.map((editor) => ({
            name: editor.label,
            description: editor.command,
            href: "/library/mcp",
            code: true,
            docs: "/docs/llm#mcp",
            mark: LIBRARY_MARKS[`mcp/${editor.id}`] ?? `letter:${editor.label}`,
            id: `mcp/${editor.id}`,
            command: editor.command,
            prompt: `Connect ${editor.label} to the assistant-ui MCP server at ${MCP_URL} (Streamable HTTP)`,
          })),
        ),
      },
    ],
  },
];

/** The start every install command in a tab shares, for tabs whose items install by command. */
const COMMAND_BASE: Partial<Record<LibrarySectionId, string>> = {
  components: SHADCN_ADD,
  starters: STARTERS_COMMAND,
  runtimes: "npm install",
  integrations: "npm install",
  utilities: "npm install",
  agents: `${SKILLS_COMMAND} -a`,
  mcp: MCP_COMMAND,
};

const STEP_LIMIT = 8;

const entryInstall = (
  entry: LibraryEntry,
): { command?: string | undefined; prompt?: string | undefined } => {
  switch (entry.kind) {
    case "link":
      return entry.link;
    case "starter":
      return {
        command: starterCommand(entry.starter),
        prompt: starterPrompt(entry.starter),
      };
    case "preset":
      return {
        command: presetCommand(entry.preset),
        prompt: presetPrompt(entry.preset),
      };
    default:
      return {};
  }
};

const commandsFor = (
  section: Omit<LibrarySection, "commands">,
): LibraryCommands | undefined => {
  if (section.id === "skills") {
    return { base: "npx skills", steps: SKILLS_COMMAND_STEPS };
  }
  const base = COMMAND_BASE[section.id];
  if (!base) return undefined;
  const steps = section.groups
    .flatMap((group) => group.entries)
    .flatMap((entry): LibraryCommandStep[] => {
      const { command, prompt } = entryInstall(entry);
      if (command !== base && !command?.startsWith(`${base} `)) return [];
      return [
        {
          rest: command.slice(base.length + 1),
          does: entryName(entry),
          ...(prompt && { prompt }),
        },
      ];
    })
    .slice(0, STEP_LIMIT);
  return steps.length > 0 ? { base, steps } : undefined;
};

export const entryName = (entry: LibraryEntry): string => {
  switch (entry.kind) {
    case "link":
      return entry.link.name;
    case "block":
      return entry.block.title;
    case "starter":
      return entry.starter.label;
    case "preset":
      return entry.preset.name;
    case "skill":
      return entry.skill.title;
  }
};

export const LIBRARY_SECTIONS: readonly LibrarySection[] = SECTIONS.map(
  (section) => {
    const commands = commandsFor(section);
    return { ...section, ...(commands && { commands }) };
  },
);

const COMPONENT_LINKS: readonly LibraryLink[] = LIBRARY_SECTIONS.filter(
  (section) => section.id === "components",
).flatMap((section) =>
  section.groups.flatMap((group) =>
    group.entries.flatMap((entry) =>
      entry.kind === "link" ? [entry.link] : [],
    ),
  ),
);

/**
 * The library component a registry item is, as a starter lists it: an
 * assistant-ui item by the name its install command ends with, a shadcn/ui
 * item by its slug. Absent for a support file such as a hook.
 */
export const componentForRegistryItem = (
  item: string,
  ui: boolean,
): LibraryLink | undefined =>
  COMPONENT_LINKS.find((link) =>
    ui
      ? link.id === `ui/${item}`
      : link.command?.endsWith(` @assistant-ui/${item}`),
  );

export const entryKey = (entry: LibraryEntry): string => {
  switch (entry.kind) {
    case "link":
      return `${entry.link.href}:${entry.link.name}`;
    case "block":
      return entry.block.slug;
    case "starter":
      return entry.starter.name;
    case "preset":
      return `preset:${entry.preset.id}`;
    case "skill":
      return entry.skill.name;
  }
};

const includes = (texts: readonly string[], query: string) =>
  texts.some((text) => text.toLowerCase().includes(query));

export const matchesEntry = (entry: LibraryEntry, query: string): boolean => {
  switch (entry.kind) {
    case "link":
      return includes([entry.link.name, entry.link.description], query);
    case "block":
      return includes(
        [
          entry.block.title,
          entry.block.description,
          ...entry.block.useCases,
          ...entry.block.stack,
        ],
        query,
      );
    case "starter":
      return includes(
        [
          entry.starter.label,
          entry.starter.name,
          entry.starter.description,
          entry.starter.framework,
          entry.starter.runtime ?? "",
          ...(entry.starter.integrations ?? []),
        ],
        query,
      );
    case "preset":
      return includes(
        [entry.preset.name, entry.preset.id, entry.preset.description],
        query,
      );
    case "skill":
      return matchesSkill(entry.skill, query);
  }
};

export const sectionCount = (section: LibrarySection): number =>
  section.groups.reduce((total, group) => total + group.entries.length, 0);

export const libraryTotal = (sections: readonly LibrarySection[]): number =>
  sections.reduce((total, section) => total + sectionCount(section), 0);
