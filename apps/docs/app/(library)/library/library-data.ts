import { DESIGN_COMPONENTS } from "@/components/pages/design/registry-meta";
import { ELEMENTS } from "@/components/pages/elements/registry";
import { listSkills } from "@/lib/agent-skills";

export type LibraryGroup = {
  label: string;
  items: readonly string[];
};

export type LibrarySection = {
  id: string;
  title: string;
  description: string;
  command: string;
  href: string;
  groups: readonly LibraryGroup[];
};

// The CLI is not a dependency of the docs app, so these lists mirror the
// templates and examples in packages/cli/src/commands/create.ts.
const TEMPLATES = [
  "Default",
  "Minimal",
  "Cloud",
  "Cloud + Clerk",
  "Shared cloud chat",
  "LangChain",
  "MCP",
  "Eve",
  "VS Code",
];

const EXAMPLES = [
  "AG-UI",
  "Google ADK",
  "AI SDK v7",
  "Eve",
  "Artifacts",
  "Assistant Transport",
  "Chain of Thought",
  "Cloud",
  "Custom Thread List",
  "ElevenLabs Conversational",
  "ElevenLabs Scribe",
  "LiveKit Voice",
  "Expo",
  "Interactables",
  "External Store",
  "FFmpeg",
  "LangGraph",
  "React Hook Form",
  "React Ink",
  "React Router",
  "TanStack",
  "Resumable Stream",
  "OpenUI",
];

const MCP_CLIENTS = [
  "Cursor",
  "Windsurf",
  "VS Code",
  "Zed",
  "Claude Code",
  "Claude Desktop",
];

export const LIBRARY_SECTIONS: readonly LibrarySection[] = [
  {
    id: "components",
    title: "Components",
    description:
      "Chat elements, UI components, and backend routes, copied into your project from the registry.",
    command: "npx assistant-ui@latest add thread",
    href: "/components",
    groups: [
      { label: "Elements", items: ELEMENTS.map((element) => element.title) },
      {
        label: "UI",
        items: DESIGN_COMPONENTS.map((component) => component.name),
      },
      {
        label: "Routes and pages",
        items: ["AI SDK backend", "AI SDK resumable backend", "Eve chat"],
      },
    ],
  },
  {
    id: "starters",
    title: "Starters",
    description: "Templates and example apps that create a new project.",
    command: "npx assistant-ui@latest create my-app",
    href: "/docs/cli#create",
    groups: [
      { label: "Templates", items: TEMPLATES },
      { label: "Examples", items: EXAMPLES },
    ],
  },
  {
    id: "skills",
    title: "Skills",
    description:
      "Instructions a coding agent loads to build with assistant-ui.",
    command: "npx skills add assistant-ui/skills",
    href: "/docs/llm#skills",
    groups: [
      { label: "Skills", items: listSkills().map((skill) => skill.name) },
    ],
  },
  {
    id: "mcp",
    title: "MCP server",
    description:
      "Connects your editor's agent to the assistant-ui docs and examples.",
    command: "npx assistant-ui@latest mcp",
    href: "/docs/cli#mcp",
    groups: [{ label: "Editors", items: MCP_CLIENTS }],
  },
];

export const sectionCount = (section: LibrarySection): number =>
  section.groups.reduce((total, group) => total + group.items.length, 0);

export const LIBRARY_TOTAL = LIBRARY_SECTIONS.reduce(
  (total, section) => total + sectionCount(section),
  0,
);
