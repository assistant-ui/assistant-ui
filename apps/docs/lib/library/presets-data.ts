import { LIBRARY_SITE, agentSetupPrompt } from "./agent-prompt";

/** One color in each color mode. */
export type PresetTone = { light: string; dark: string };

export type LibraryPreset = {
  /** The name `create --preset` takes. */
  id: string;
  name: string;
  description: string;
  /** How round its message bubbles and composer are. */
  radius: "sm" | "md" | "lg" | "full";
  /** The side the person's messages sit on. */
  userSide: "left" | "right";
  /** The colors it sets; one it leaves out keeps the project's own. */
  colors: {
    accent: PresetTone;
    background?: PresetTone;
    foreground?: PresetTone;
    border?: PresetTone;
    userMessage?: PresetTone;
    composer?: PresetTone;
  };
};

const tone = (light: string, dark: string): PresetTone => ({ light, dark });

// The CLI and the playground are not dependencies of the library, so this list
// mirrors PRESETS in components/pages/playground/presets.ts.
export const LIBRARY_PRESETS: readonly LibraryPreset[] = [
  {
    id: "default",
    name: "Default",
    description: "A clean, modern chat with every feature on.",
    radius: "lg",
    userSide: "right",
    colors: { accent: tone("#0ea5e9", "#0ea5e9") },
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "A rounded chat in the style of ChatGPT.",
    radius: "full",
    userSide: "right",
    colors: {
      accent: tone("#10a37f", "#ffffff"),
      background: tone("#ffffff", "#212121"),
      foreground: tone("#0d0d0d", "#ececec"),
      border: tone("#e5e5e5", "#424242"),
      userMessage: tone("#f7f7f8", "#2f2f2f"),
      composer: tone("#f7f7f8", "#2f2f2f"),
    },
  },
  {
    id: "claude",
    name: "Claude",
    description: "A warm serif chat in the style of Claude.",
    radius: "lg",
    userSide: "right",
    colors: {
      accent: tone("#c96442", "#d4a27a"),
      background: tone("#faf9f5", "#2b2a27"),
      foreground: tone("#3d3929", "#e8e4d9"),
      border: tone("#e5e0d5", "#3d3b36"),
      userMessage: tone("#f5f0e6", "#3d3b36"),
      composer: tone("#ffffff", "#1f1e1b"),
    },
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "A search-style chat that suggests follow-up questions.",
    radius: "lg",
    userSide: "left",
    colors: {
      accent: tone("#20b8cd", "#22d3ee"),
      background: tone("#ffffff", "#0f172a"),
      foreground: tone("#1e293b", "#e2e8f0"),
      border: tone("#e2e8f0", "#334155"),
      userMessage: tone("#f1f5f9", "#1e293b"),
      composer: tone("#f8fafc", "#1e293b"),
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "A stripped-down chat with only the essential features.",
    radius: "md",
    userSide: "right",
    colors: { accent: tone("#171717", "#fafafa") },
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "A clean, rounded chat in the style of Gemini.",
    radius: "full",
    userSide: "right",
    colors: {
      accent: tone("#1a73e8", "#8ab4f8"),
      background: tone("#ffffff", "#1f1f1f"),
      foreground: tone("#1f1f1f", "#e3e3e3"),
      border: tone("#e8eaed", "#3c4043"),
      userMessage: tone("#e8f0fe", "#303134"),
      composer: tone("#ffffff", "#303134"),
    },
  },
  {
    id: "copilot",
    name: "Copilot",
    description: "A monospace developer chat in the style of GitHub Copilot.",
    radius: "lg",
    userSide: "right",
    colors: {
      accent: tone("#8b5cf6", "#8b5cf6"),
      background: tone("#ffffff", "#0d1117"),
      foreground: tone("#1f2328", "#e6edf3"),
      border: tone("#d0d7de", "#30363d"),
      userMessage: tone("#f6f8fa", "#161b22"),
      composer: tone("#f6f8fa", "#161b22"),
    },
  },
  {
    id: "slack",
    name: "Slack",
    description:
      "A team chat in the style of Slack, with every message on the left.",
    radius: "sm",
    userSide: "left",
    colors: {
      accent: tone("#007a5a", "#2eb67d"),
      background: tone("#ffffff", "#1a1d21"),
      foreground: tone("#1d1c1d", "#d1d2d3"),
      border: tone("#dddddd", "#323539"),
    },
  },
  {
    id: "grok",
    name: "Grok",
    description: "A black-and-white chat in the style of Grok.",
    radius: "full",
    userSide: "right",
    colors: {
      accent: tone("#000000", "#ffffff"),
      background: tone("#ffffff", "#000000"),
      foreground: tone("#000000", "#ffffff"),
      border: tone("#e4e4e7", "#27272a"),
      userMessage: tone("#f4f4f5", "#18181b"),
      composer: tone("#f4f4f5", "#18181b"),
    },
  },
];

export const presetId = ({ id }: LibraryPreset): string => `presets/${id}`;

export const presetCommand = ({ id }: LibraryPreset): string =>
  `npx assistant-ui@latest create my-app --preset ${id}`;

/** The registry item the CLI hands shadcn for a preset name. */
const presetUrl = ({ id }: LibraryPreset): string =>
  `${LIBRARY_SITE}/playground/init?preset=${id}`;

export const presetPrompt = (preset: LibraryPreset): string =>
  agentSetupPrompt(
    [],
    `Apply the \`${preset.id}\` preset with \`npx shadcn@latest add "${presetUrl(preset)}"\``,
  );

/** What a preset counts as under the starters' filters: `create --preset` builds on the default template. */
export const PRESET_STACK = {
  framework: "Next.js",
  runtime: "AI SDK",
} as const;
