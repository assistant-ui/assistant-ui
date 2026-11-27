export const SKILLS_REPO = "assistant-ui/skills";

export const SKILLS_COMMAND = `npx skills add ${SKILLS_REPO}`;
export const SKILLS_PROMPT = `Install the assistant-ui agent skills with \`${SKILLS_COMMAND}\``;
export const SKILLS_REPO_HREF = `https://github.com/${SKILLS_REPO}`;

export type SkillGroupId = "start" | "interface" | "runtime" | "platforms";

export type SkillGroup = {
  id: SkillGroupId;
  title: string;
  description: string;
};

export const SKILL_GROUPS: readonly SkillGroup[] = [
  {
    id: "start",
    title: "Start",
    description: "Find your way around, install, and upgrade.",
  },
  {
    id: "interface",
    title: "Interface",
    description: "The chat surface and what renders inside it.",
  },
  {
    id: "runtime",
    title: "Runtime and backend",
    description: "State, tools, streaming, and hosted services.",
  },
  {
    id: "platforms",
    title: "Platforms",
    description: "Chat outside the browser.",
  },
];

/**
 * Each skill's group and its one-line description for a card or a row, in the
 * order the skills repo lists them. The line is written for this page; a
 * skill missing here lands last and borrows the start of its own description.
 */
export const SKILL_CATALOG: Record<
  string,
  { group: SkillGroupId; summary: string }
> = {
  "assistant-ui": {
    group: "start",
    summary: "The overview: architecture, packages, and which skill to use.",
  },
  setup: {
    group: "start",
    summary: "Install with the CLI and pick the runtime for your backend.",
  },
  update: {
    group: "start",
    summary: "Upgrade assistant-ui and the AI SDK, and apply migrations.",
  },
  elements: {
    group: "interface",
    summary: "Add and customize the styled components from the registry.",
  },
  primitives: {
    group: "interface",
    summary: "Build your own chat UI from unstyled parts.",
  },
  "generative-ui": {
    group: "interface",
    summary: "Let the model compose UI from your components.",
  },
  "thread-list": {
    group: "interface",
    summary: "Add and manage multiple conversations.",
  },
  markdown: {
    group: "interface",
    summary: "Render messages as markdown with code, math, and diagrams.",
  },
  runtime: {
    group: "runtime",
    summary: "Create a runtime and read or change chat state.",
  },
  tools: {
    group: "runtime",
    summary: "Define tools the model can call and render their results.",
  },
  streaming: {
    group: "runtime",
    summary: "Build a custom streaming backend with assistant-stream.",
  },
  cloud: {
    group: "runtime",
    summary: "Save threads and add auth with Assistant Cloud.",
  },
  copilots: {
    group: "runtime",
    summary: "Let the assistant read and act on your app.",
  },
  "react-mcp": {
    group: "runtime",
    summary: "Let users connect their own MCP servers.",
  },
  observability: {
    group: "runtime",
    summary: "Trace model calls and show the spans in your UI.",
  },
  "react-native": {
    group: "platforms",
    summary: "Build chat for Expo and React Native.",
  },
  ink: {
    group: "platforms",
    summary: "Build chat for the terminal with Ink.",
  },
};

export type SkillReference = {
  file: string;
  /** Where the file is read from: the skills repo, at the commit this site pins. */
  href: string;
  /** The file's place inside the skill's folder, such as `references/ai-sdk.md`. */
  path: string;
};

/** What the skills page shows for one skill; the full SKILL.md is fetched from `rawHref` on demand. */
export type LibrarySkill = {
  name: string;
  title: string;
  /** One line for a card or a row. */
  summary: string;
  /** The description an agent matches a task against; search reads it. */
  description: string;
  group: SkillGroupId;
  sections: readonly string[];
  references: readonly SkillReference[];
  command: string;
  /** What to tell a coding agent to install this skill. */
  prompt: string;
  slash: string;
  /** The site's copy of SKILL.md, with its links made absolute. */
  rawHref: string;
  /** SKILL.md as the skills repo holds it, for a download. */
  sourceFileHref: string;
  sourceHref: string;
};

export const matchesSkill = (skill: LibrarySkill, query: string) =>
  [
    skill.name,
    skill.title,
    skill.summary,
    skill.description,
    ...skill.sections,
  ].some((text) => text.toLowerCase().includes(query));
