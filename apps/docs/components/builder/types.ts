export type Theme = "light" | "dark" | "system";
export type BorderRadius = "none" | "sm" | "md" | "lg" | "full";
export type FontSize = "13px" | "14px" | "15px" | "16px";
export type MessageSpacing = "compact" | "comfortable" | "spacious";
export type TypingIndicator = "none" | "dot";
export type LoadingIndicator = "none" | "spinner" | "text";
export type CodeHighlightTheme =
  | "none"
  | "github"
  | "vitesse"
  | "tokyo-night"
  | "one-dark-pro"
  | "dracula";

export interface ActionBarConfig {
  copy: boolean;
  reload: boolean;
  speak: boolean;
  feedback: boolean;
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
  codeHighlightTheme: CodeHighlightTheme;
  reasoning: boolean;
  sources: boolean;
  followUpSuggestions: boolean;
  avatar: boolean;
  typingIndicator: TypingIndicator;
  loadingIndicator: LoadingIndicator;
  loadingText: string;
}

export type UserMessagePosition = "right" | "left";

export interface ThemeColor {
  light: string;
  dark: string;
}

export interface StylesConfig {
  theme: Theme;

  // Colors (with light/dark variants)
  colors: {
    accent: ThemeColor;
    background?: ThemeColor;
    foreground?: ThemeColor;
    muted?: ThemeColor;
    mutedForeground?: ThemeColor;
    border?: ThemeColor;
    userMessage?: ThemeColor;
    assistantMessage?: ThemeColor;
    composer?: ThemeColor;
    userAvatar?: ThemeColor;
    assistantAvatar?: ThemeColor;
    suggestion?: ThemeColor;
    suggestionBorder?: ThemeColor;
  };

  // Layout
  borderRadius: BorderRadius;
  maxWidth: string;
  fontFamily: string;
  fontSize: FontSize;
  messageSpacing: MessageSpacing;
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

// Default theme colors
export const DEFAULT_COLORS = {
  accent: { light: "#0ea5e9", dark: "#0ea5e9" },
  background: { light: "#ffffff", dark: "#18181b" },
  foreground: { light: "#09090b", dark: "#fafafa" },
  muted: { light: "#f4f4f5", dark: "#27272a" },
  mutedForeground: { light: "#71717a", dark: "#a1a1aa" },
  border: { light: "#e4e4e7", dark: "#3f3f46" },
  userMessage: { light: "#f4f4f5", dark: "#27272a" },
  composer: { light: "#ffffff", dark: "#27272a" },
  userAvatar: { light: "#e4e4e7", dark: "#3f3f46" },
  assistantAvatar: { light: "#e4e4e7", dark: "#3f3f46" },
  suggestion: { light: "#fafafa", dark: "#27272a" },
  suggestionBorder: { light: "#e4e4e7", dark: "#3f3f46" },
} as const;

export const DEFAULT_CONFIG: BuilderConfig = {
  components: {
    attachments: true,
    branchPicker: true,
    editMessage: true,
    actionBar: {
      copy: true,
      reload: true,
      speak: false,
      feedback: false,
    },
    threadWelcome: true,
    suggestions: true,
    scrollToBottom: true,
    markdown: true,
    codeHighlightTheme: "vitesse",
    reasoning: false,
    sources: false,
    followUpSuggestions: false,
    avatar: false,
    typingIndicator: "dot",
    loadingIndicator: "text",
    loadingText: "Thinking...",
  },
  styles: {
    theme: "light",
    colors: {
      accent: DEFAULT_COLORS.accent,
    },
    borderRadius: "lg",
    maxWidth: "44rem",
    fontFamily: "system-ui",
    fontSize: "14px",
    messageSpacing: "comfortable",
    userMessagePosition: "right",
    animations: true,
  },
};

export const FONT_FAMILIES = [
  { label: "System", value: "system-ui" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Geist", value: "GeistSans, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "ui-monospace, monospace" },
] as const;

export const FONT_SIZES = [
  { label: "13px", value: "13px" },
  { label: "14px", value: "14px" },
  { label: "15px", value: "15px" },
  { label: "16px", value: "16px" },
] as const;

export const MAX_WIDTHS = [
  { label: "Narrow", value: "32rem" },
  { label: "Default", value: "44rem" },
  { label: "Wide", value: "56rem" },
  { label: "Full", value: "100%" },
] as const;

export const MESSAGE_SPACINGS = [
  { label: "Compact", value: "compact" },
  { label: "Comfortable", value: "comfortable" },
  { label: "Spacious", value: "spacious" },
] as const;

export const USER_MESSAGE_POSITIONS = [
  { label: "Left", value: "left" },
  { label: "Right", value: "right" },
] as const;

export const BORDER_RADIUSES = [
  { label: "None", value: "none" },
  { label: "Small", value: "sm" },
  { label: "Medium", value: "md" },
  { label: "Large", value: "lg" },
  { label: "Full", value: "full" },
] as const;

export const TYPING_INDICATORS = [
  { label: "None", value: "none" },
  { label: "Dot (●)", value: "dot" },
] as const;

export const LOADING_INDICATORS = [
  { label: "None", value: "none" },
  { label: "Spinner", value: "spinner" },
  { label: "Text", value: "text" },
] as const;

export const CODE_HIGHLIGHT_THEMES = [
  { label: "None", value: "none" },
  { label: "GitHub", value: "github" },
  { label: "Vitesse", value: "vitesse" },
  { label: "Tokyo Night", value: "tokyo-night" },
  { label: "One Dark Pro", value: "one-dark-pro" },
  { label: "Dracula", value: "dracula" },
] as const;

export const SHIKI_THEME_MAP: Record<
  Exclude<CodeHighlightTheme, "none">,
  { dark: string; light: string }
> = {
  github: { dark: "github-dark", light: "github-light" },
  vitesse: { dark: "vitesse-dark", light: "vitesse-light" },
  "tokyo-night": { dark: "tokyo-night", light: "github-light" },
  "one-dark-pro": { dark: "one-dark-pro", light: "github-light" },
  dracula: { dark: "dracula", light: "github-light" },
};
