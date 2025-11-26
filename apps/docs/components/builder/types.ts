export type Theme = "light" | "dark" | "system";
export type BorderRadius = "none" | "sm" | "md" | "lg" | "full";

export interface ActionBarConfig {
  copy: boolean;
  reload: boolean;
  speak: boolean;
}

export interface ComponentsConfig {
  attachments: boolean;
  branchPicker: boolean;
  editMessage: boolean;
  actionBar: ActionBarConfig;
  threadWelcome: boolean;
  suggestions: boolean;
  scrollToBottom: boolean;
  markdown: boolean;
  reasoning: boolean;
  followUpSuggestions: boolean;
  avatar: boolean;
  typingIndicator: boolean;
}

export type UserMessagePosition = "right" | "left";

export interface StylesConfig {
  theme: Theme;
  accentColor: string;
  borderRadius: BorderRadius;
  maxWidth: string;
  fontFamily: string;
  userMessagePosition: UserMessagePosition;
  animations: boolean;
}

export interface BuilderConfig {
  components: ComponentsConfig;
  styles: StylesConfig;
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: BuilderConfig;
}

export const DEFAULT_CONFIG: BuilderConfig = {
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
    markdown: true,
    reasoning: false,
    followUpSuggestions: false,
    avatar: false,
    typingIndicator: true,
  },
  styles: {
    theme: "light",
    accentColor: "#0ea5e9",
    borderRadius: "lg",
    maxWidth: "44rem",
    fontFamily: "system-ui",
    userMessagePosition: "right",
    animations: true,
  },
};

export const ACCENT_COLORS = [
  { name: "Sky", value: "#0ea5e9" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Emerald", value: "#10b981" },
  { name: "Slate", value: "#64748b" },
] as const;

export const FONT_FAMILIES = [
  { name: "System", value: "system-ui" },
  { name: "Inter", value: "Inter, sans-serif" },
  { name: "Geist", value: "Geist, sans-serif" },
  { name: "Serif", value: "Georgia, serif" },
  { name: "Mono", value: "ui-monospace, monospace" },
] as const;

export const MAX_WIDTHS = [
  { name: "Narrow", value: "32rem" },
  { name: "Default", value: "44rem" },
  { name: "Wide", value: "56rem" },
  { name: "Full", value: "100%" },
] as const;
