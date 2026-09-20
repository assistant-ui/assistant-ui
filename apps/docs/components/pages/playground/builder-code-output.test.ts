import { expect, it } from "vitest";
import { generateComponentCode } from "./builder-code-output";
import { DEFAULT_CONFIG } from "./types";

const THEMED_COLORS = {
  accent: { light: "#111111", dark: "#eeeeee" },
  background: { light: "#101010", dark: "#202020" },
  foreground: { light: "#f1f1f1", dark: "#e2e2e2" },
  muted: { light: "#252525", dark: "#353535" },
  mutedForeground: { light: "#a5a5a5", dark: "#b5b5b5" },
  border: { light: "#303030", dark: "#404040" },
  userMessage: { light: "#505050", dark: "#606060" },
  assistantMessage: { light: "#515151", dark: "#616161" },
  composer: { light: "#707070", dark: "#808080" },
  assistantAvatar: { light: "#717171", dark: "#818181" },
  suggestion: { light: "#909090", dark: "#a0a0a0" },
  suggestionBorder: { light: "#b0b0b0", dark: "#c0c0c0" },
};

const THEMED_COMPONENTS = {
  ...DEFAULT_CONFIG.components,
  avatar: true,
  followUpSuggestions: true,
};

it("carries every configured color for both modes and reads it from the thread", () => {
  const code = generateComponentCode({
    ...DEFAULT_CONFIG,
    components: THEMED_COMPONENTS,
    styles: { ...DEFAULT_CONFIG.styles, colors: THEMED_COLORS },
  });

  expect(code).toContain(
    'className="flex h-full flex-col bg-background text-foreground text-sm [--aui-accent:#111111] dark:[--aui-accent:#eeeeee] [--aui-accent-foreground:#ffffff] dark:[--aui-accent-foreground:#000000] [--aui-background:#101010] dark:[--aui-background:#202020]',
  );
  expect(code).toContain(
    "[--aui-muted-foreground:#a5a5a5] dark:[--aui-muted-foreground:#b5b5b5]",
  );
  expect(code).toContain(
    "[--aui-composer:#707070] dark:[--aui-composer:#808080]",
  );
  expect(code).toContain(
    '[--aui-suggestion-border:#b0b0b0] dark:[--aui-suggestion-border:#c0c0c0]"',
  );
  expect(code).not.toContain('"--aui-');
  expect(code).toContain('"--background": "var(--aui-background)"');
  expect(code).toContain('"--foreground": "var(--aui-foreground)"');
  expect(code).toContain('"--muted": "var(--aui-muted)"');
  expect(code).toContain('"--muted-foreground": "var(--aui-muted-foreground)"');
  expect(code).toContain('"--border": "var(--aui-border)"');
  expect(code).toContain('"--composer-bg": "var(--aui-composer)"');
  expect(code).toContain('"--accent-color": "var(--aui-accent)"');
  expect(code).toContain(
    "border-[color-mix(in_oklab,var(--aui-border)_60%,transparent)] focus-within:border-(--aui-border) flex w-full cursor-text",
  );
  expect(code).toContain(
    "border-(--aui-border) ms-auto flex w-full max-w-[85%]",
  );
  expect(code).toContain(
    "rounded-[var(--composer-radius)] bg-(--aui-user-message) px-4 py-2",
  );
  expect(code).toContain(
    "break-words rounded-2xl bg-(--aui-assistant-message) px-4 py-3 leading-relaxed",
  );
  expect(code).toContain("rounded-full bg-(--aui-assistant-avatar)");
  expect(code).toContain(
    "group bg-(--aui-suggestion) inset-ring inset-ring-(--aui-suggestion-border) hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--aui-suggestion))] focus-visible:ring-ring/50",
  );
  expect(code).toContain(
    "border-(--aui-suggestion-border) bg-(--aui-suggestion) hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--aui-suggestion))] rounded-md border",
  );
});

it("keeps the kit defaults when optional colors are unset", () => {
  const code = generateComponentCode({
    ...DEFAULT_CONFIG,
    components: THEMED_COMPONENTS,
  });

  expect(code).toContain(
    'className="flex h-full flex-col bg-background text-foreground text-sm [--aui-accent:#0ea5e9] [--aui-accent-foreground:#000000]"',
  );
  expect(new Set(code.match(/--aui-[a-z-]+/g))).toEqual(
    new Set(["--aui-accent", "--aui-accent-foreground"]),
  );
  expect(code).toContain(
    '"--composer-bg": "color-mix(in oklab, var(--muted) 30%, transparent)"',
  );
  expect(code).toContain(
    "border-foreground/10 focus-within:border-foreground/25 flex w-full cursor-text",
  );
  expect(code).toContain(
    "border-foreground/10 focus-within:border-foreground/25 ms-auto flex w-full max-w-[85%]",
  );
  expect(code).toContain("rounded-[var(--composer-radius)] bg-muted px-4 py-2");
  expect(code).toContain("break-words px-2 leading-relaxed");
  expect(code).toContain("rounded-full bg-primary/10");
  expect(code).toContain(
    "group hover:bg-foreground/[0.03] focus-visible:ring-ring/50",
  );
  expect(code).toContain(
    "border-foreground/10 hover:border-foreground/25 hover:bg-foreground/[0.03] rounded-md border",
  );
});
