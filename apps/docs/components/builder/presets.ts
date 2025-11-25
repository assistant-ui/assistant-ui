import type { Preset, BuilderConfig } from "./types";

export const PRESETS: Preset[] = [
  {
    id: "default",
    name: "Default",
    description: "Clean, modern design with all features enabled",
    config: {
      components: {
        attachments: true,
        branchPicker: true,
        editMessage: true,
        actionBar: {
          copy: true,
          reload: true,
          speak: false,
        },
        threadWelcome: true,
        suggestions: true,
        scrollToBottom: true,
      },
      styles: {
        theme: "light",
        accentColor: "#0ea5e9",
        borderRadius: "lg",
        maxWidth: "44rem",
        fontFamily: "system-ui",
      },
      layout: "default",
    },
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "Dark theme inspired by ChatGPT's interface",
    config: {
      components: {
        attachments: false,
        branchPicker: true,
        editMessage: true,
        actionBar: {
          copy: true,
          reload: true,
          speak: false,
        },
        threadWelcome: true,
        suggestions: false,
        scrollToBottom: false,
      },
      styles: {
        theme: "dark",
        accentColor: "#ffffff",
        borderRadius: "full",
        maxWidth: "48rem",
        fontFamily: "system-ui",
      },
      layout: "default",
    },
  },
  {
    id: "claude",
    name: "Claude",
    description: "Warm, elegant design inspired by Claude's interface",
    config: {
      components: {
        attachments: false,
        branchPicker: false,
        editMessage: false,
        actionBar: {
          copy: true,
          reload: true,
          speak: false,
        },
        threadWelcome: false,
        suggestions: false,
        scrollToBottom: false,
      },
      styles: {
        theme: "dark",
        accentColor: "#ae5630",
        borderRadius: "lg",
        maxWidth: "48rem",
        fontFamily: "Georgia, serif",
      },
      layout: "default",
    },
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "Search-focused design with prominent answers",
    config: {
      components: {
        attachments: true,
        branchPicker: true,
        editMessage: false,
        actionBar: {
          copy: true,
          reload: true,
          speak: false,
        },
        threadWelcome: true,
        suggestions: false,
        scrollToBottom: true,
      },
      styles: {
        theme: "dark",
        accentColor: "#22d3ee",
        borderRadius: "lg",
        maxWidth: "42rem",
        fontFamily: "system-ui",
      },
      layout: "default",
    },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Stripped-down interface with only essential features",
    config: {
      components: {
        attachments: false,
        branchPicker: false,
        editMessage: false,
        actionBar: {
          copy: true,
          reload: false,
          speak: false,
        },
        threadWelcome: false,
        suggestions: false,
        scrollToBottom: false,
      },
      styles: {
        theme: "light",
        accentColor: "#171717",
        borderRadius: "md",
        maxWidth: "40rem",
        fontFamily: "system-ui",
      },
      layout: "default",
    },
  },
];

export function getPresetById(id: string): Preset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

export function configMatchesPreset(config: BuilderConfig): Preset | undefined {
  return PRESETS.find(
    (preset) => JSON.stringify(preset.config) === JSON.stringify(config),
  );
}
