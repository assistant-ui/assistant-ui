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
  LIBRARY_TOOLS,
  LIBRARY_UTILITIES,
  type LibraryPageGroup,
} from "./docs-data";
import { MCP_COMMAND, MCP_EDITORS, MCP_PROMPT } from "./mcp-data";
import {
  LIBRARY_SKILLS,
  SKILLS_COMMAND,
  SKILLS_PROMPT,
  SKILL_GROUPS,
  matchesSkill,
  type LibrarySkill,
} from "./skills-data";
import {
  EXAMPLES,
  TEMPLATES,
  starterPrompt,
  type Starter,
} from "./starters-data";

export type LibrarySectionId =
  | "components"
  | "blocks"
  | "starters"
  | "runtimes"
  | "tools"
  | "integrations"
  | "utilities"
  | "skills"
  | "mcp";

/** An item that has its own page, shown as a link to it. */
export type LibraryLink = {
  name: string;
  description: string;
  href: string;
  /** Set when the description is a command, so it is set in the code face. */
  code?: boolean;
  /** The section's `traits` this item has. */
  traits?: readonly string[];
};

export type LibraryEntry =
  | { kind: "link"; link: LibraryLink }
  | { kind: "block"; block: LibraryBlock }
  | { kind: "starter"; starter: Starter }
  | { kind: "skill"; skill: LibrarySkill };

export type LibraryGroup = {
  label: string;
  entries: readonly LibraryEntry[];
};

export type LibrarySection = {
  id: LibrarySectionId;
  title: string;
  /** What its items are called, as in "Search starters". */
  noun: string;
  description: string;
  /** Absent when each item is set up from its own page. */
  install?: {
    command: string;
    /** The same install, worded for a coding agent. */
    prompt: string;
  };
  href: string;
  groups: readonly LibraryGroup[];
  /** Things only some of its items are, each offered as a filter. */
  traits?: readonly { id: string; label: string }[];
};

const links = (items: readonly LibraryLink[]): LibraryEntry[] =>
  items.map((link) => ({ kind: "link", link }));

const pages = (groups: readonly LibraryPageGroup[]): LibraryGroup[] =>
  groups.map((group) => ({ label: group.label, entries: links(group.pages) }));

const starters = (items: readonly Starter[]): LibraryEntry[] =>
  items.map((starter) => ({ kind: "starter", starter }));

const COMPONENTS_COMMAND = "npx assistant-ui@latest add thread";
const STARTERS_COMMAND = "npx assistant-ui@latest create my-app";
const defaultStarter = TEMPLATES.find((starter) => starter.name === "default");

export const LIBRARY_SECTIONS: readonly LibrarySection[] = [
  {
    id: "components",
    title: "Components",
    noun: "components",
    description:
      "Chat elements, UI components, primitives, and the parts a model can write.",
    install: {
      command: COMPONENTS_COMMAND,
      prompt: `Add the assistant-ui thread component with \`${COMPONENTS_COMMAND}\``,
    },
    href: "/components",
    traits: LIBRARY_TRAITS,
    groups: [
      {
        label: "Elements",
        entries: links(
          LIBRARY_ELEMENTS.map((element) => ({
            name: element.name,
            description: element.description,
            href: `/elements/${element.slug}`,
            ...(element.traits && { traits: element.traits }),
          })),
        ),
      },
      {
        label: "UI",
        entries: links(
          LIBRARY_UI_COMPONENTS.map((component) => ({
            name: component.name,
            description: component.description,
            href: `/design/components/${component.slug}`,
          })),
        ),
      },
      ...pages(LIBRARY_PRIMITIVES),
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
      { label: "Features", entries: links(LIBRARY_FEATURES) },
      {
        label: "Routes and pages",
        entries: links([
          {
            name: "AI SDK backend",
            description:
              "A Next.js route handler that streams chat completions through the AI SDK.",
            href: "/docs/runtimes/ai-sdk/overview",
          },
          {
            name: "AI SDK resumable backend",
            description:
              "AI SDK route handlers with a resumable stream, so a run survives a reload.",
            href: "/docs/runtimes/resumable-streams",
          },
          {
            name: "Eve chat",
            description:
              "A chat page for an Eve agent, drawn through an assistant-ui thread.",
            href: "/docs/runtimes/eve/overview",
          },
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
    description: "Templates and example apps that create a new project.",
    install: {
      command: STARTERS_COMMAND,
      prompt: defaultStarter
        ? starterPrompt(defaultStarter)
        : `Create an assistant-ui app with \`${STARTERS_COMMAND}\``,
    },
    href: "/library/starters",
    groups: [
      { label: "Templates", entries: starters(TEMPLATES) },
      { label: "Examples", entries: starters(EXAMPLES) },
    ],
  },
  {
    id: "runtimes",
    title: "Runtimes",
    noun: "runtimes",
    description: "Adapters that connect the chat to a backend.",
    href: "/docs/runtimes/pick-a-runtime",
    groups: pages(LIBRARY_RUNTIMES),
  },
  {
    id: "tools",
    title: "Tools",
    noun: "tools",
    description: "Tool calls, tool UI, generative UI, and MCP.",
    href: "/docs/tools",
    groups: pages(LIBRARY_TOOLS),
  },
  {
    id: "integrations",
    title: "Integrations",
    noun: "integrations",
    description: "Gateways, observability, auth, persistence, and attachments.",
    href: "/docs/integrations",
    groups: pages(LIBRARY_INTEGRATIONS),
  },
  {
    id: "utilities",
    title: "Utilities",
    noun: "utilities",
    description: "Standalone packages that work without assistant-ui.",
    href: "/docs/utilities/heat-graph",
    groups: pages(LIBRARY_UTILITIES),
  },
  {
    id: "skills",
    title: "Skills",
    noun: "skills",
    description:
      "Instructions a coding agent loads to build with assistant-ui.",
    install: { command: SKILLS_COMMAND, prompt: SKILLS_PROMPT },
    href: "/library/skills",
    groups: SKILL_GROUPS.map((group) => ({
      label: group.title,
      entries: LIBRARY_SKILLS.filter((skill) => skill.group === group.id).map(
        (skill): LibraryEntry => ({ kind: "skill", skill }),
      ),
    })).filter((group) => group.entries.length > 0),
  },
  {
    id: "mcp",
    title: "MCP server",
    noun: "editors",
    description:
      "Connects your editor's agent to the assistant-ui docs and examples.",
    install: { command: MCP_COMMAND, prompt: MCP_PROMPT },
    href: "/library/mcp",
    groups: [
      {
        label: "Editors",
        entries: links(
          MCP_EDITORS.map((editor) => ({
            name: editor.label,
            description: editor.command,
            href: "/library/mcp",
            code: true,
          })),
        ),
      },
    ],
  },
];

export const entryName = (entry: LibraryEntry): string => {
  switch (entry.kind) {
    case "link":
      return entry.link.name;
    case "block":
      return entry.block.title;
    case "starter":
      return entry.starter.label;
    case "skill":
      return entry.skill.title;
  }
};

export const entryKey = (entry: LibraryEntry): string => {
  switch (entry.kind) {
    case "link":
      return `${entry.link.href}:${entry.link.name}`;
    case "block":
      return entry.block.slug;
    case "starter":
      return entry.starter.name;
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
    case "skill":
      return matchesSkill(entry.skill, query);
  }
};

export const sectionCount = (section: LibrarySection): number =>
  section.groups.reduce((total, group) => total + group.entries.length, 0);

export const libraryTotal = (sections: readonly LibrarySection[]): number =>
  sections.reduce((total, section) => total + sectionCount(section), 0);
