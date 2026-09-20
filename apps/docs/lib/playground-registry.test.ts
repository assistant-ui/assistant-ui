import { expect, it } from "vitest";
import {
  type BorderRadius,
  DEFAULT_CONFIG,
  type FontSize,
} from "../components/pages/playground/types";
import { generateRegistryJson } from "./playground-registry";
import { decodeConfig } from "./playground-url-state";

it.each<{ fontSize: FontSize; className: string }>([
  { fontSize: "13px", className: "text-[13px]" },
  { fontSize: "14px", className: "text-sm" },
  { fontSize: "15px", className: "text-[15px]" },
  { fontSize: "16px", className: "text-base" },
])("preserves $fontSize in the installed thread", ({ fontSize, className }) => {
  const config = {
    ...DEFAULT_CONFIG,
    styles: { ...DEFAULT_CONFIG.styles, fontSize },
  };
  const registry = generateRegistryJson(config);

  expect(registry.files[0]?.content).toContain(`text-foreground ${className}"`);
});

it("preserves the default font size in the installed thread", () => {
  const registry = generateRegistryJson(DEFAULT_CONFIG);

  expect(registry.files[0]?.content).toContain('text-foreground text-sm"');
});

it("uses the fallback for an unknown font size in decoded configuration", () => {
  const encoded = Buffer.from(
    JSON.stringify({ styles: { fontSize: "18px" } }),
  ).toString("base64url");
  const registry = generateRegistryJson(decodeConfig(encoded));

  expect(registry.files[0]?.content).toContain('text-foreground text-base"');
});

it.each<[BorderRadius, string]>([
  ["none", "0"],
  ["sm", "0.5rem"],
  ["md", "0.75rem"],
  ["lg", "1rem"],
  ["full", "1.5rem"],
])(
  "preserves the selected %s radius in the installed composer",
  (borderRadius, radius) => {
    const config = {
      ...DEFAULT_CONFIG,
      styles: { ...DEFAULT_CONFIG.styles, borderRadius },
    };
    const registry = generateRegistryJson(config);

    expect(registry.files[0]?.content).toContain(
      `"--composer-radius": "${radius}"`,
    );
  },
);

it("preserves the fallback radius for unknown decoded values", () => {
  const config = decodeConfig(
    Buffer.from(JSON.stringify({ styles: { borderRadius: "xl" } })).toString(
      "base64url",
    ),
  );
  const registry = generateRegistryJson(config);

  expect(registry.files[0]?.content).toContain('"--composer-radius": "0.5rem"');
});

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
  userAvatar: { light: "#727272", dark: "#828282" },
  assistantAvatar: { light: "#717171", dark: "#818181" },
  suggestion: { light: "#909090", dark: "#a0a0a0" },
  suggestionBorder: { light: "#b0b0b0", dark: "#c0c0c0" },
};

const THEMED_COMPONENTS = {
  ...DEFAULT_CONFIG.components,
  avatar: true,
  followUpSuggestions: true,
};

it("emits every configured color and reads it from the installed thread", () => {
  const registry = generateRegistryJson({
    ...DEFAULT_CONFIG,
    components: THEMED_COMPONENTS,
    styles: { ...DEFAULT_CONFIG.styles, colors: THEMED_COLORS },
  });
  const content = registry.files[0]?.content ?? "";

  expect(registry.cssVars.light).toMatchObject({
    "--aui-accent": "#111111",
    "--aui-accent-foreground": "#ffffff",
    "--aui-background": "#101010",
    "--aui-foreground": "#f1f1f1",
    "--aui-muted": "#252525",
    "--aui-muted-foreground": "#a5a5a5",
    "--aui-border": "#303030",
    "--aui-user-message": "#505050",
    "--aui-assistant-message": "#515151",
    "--aui-composer": "#707070",
    "--aui-user-avatar": "#727272",
    "--aui-assistant-avatar": "#717171",
    "--aui-suggestion": "#909090",
    "--aui-suggestion-border": "#b0b0b0",
  });
  expect(registry.cssVars.dark).toMatchObject({
    "--aui-accent": "#eeeeee",
    "--aui-accent-foreground": "#000000",
    "--aui-background": "#202020",
    "--aui-composer": "#808080",
    "--aui-user-avatar": "#828282",
    "--aui-suggestion-border": "#c0c0c0",
  });
  expect(content).toContain(
    'className="flex h-full flex-col bg-background text-foreground text-sm"',
  );
  expect(content).toContain('"--background": "var(--aui-background)"');
  expect(content).toContain('"--foreground": "var(--aui-foreground)"');
  expect(content).toContain('"--muted": "var(--aui-muted)"');
  expect(content).toContain(
    '"--muted-foreground": "var(--aui-muted-foreground)"',
  );
  expect(content).toContain('"--border": "var(--aui-border)"');
  expect(content).toContain('"--composer-bg": "var(--aui-composer)"');
  expect(content).toContain('"--accent-color": "var(--aui-accent)"');
  expect(content).toContain(
    "border-[color-mix(in_oklab,var(--aui-border)_60%,transparent)] focus-within:border-(--aui-border) flex w-full cursor-text",
  );
  expect(content).toContain(
    "border-(--aui-border) ml-auto flex w-full max-w-[85%]",
  );
  expect(content).toContain(
    "rounded-[var(--composer-radius)] bg-(--aui-user-message) px-4 py-2",
  );
  expect(content).toContain(
    "break-words rounded-2xl bg-(--aui-assistant-message) px-4 py-3 leading-relaxed",
  );
  expect(content).toContain("rounded-full bg-(--aui-user-avatar)");
  expect(content).toContain("rounded-full bg-(--aui-assistant-avatar)");
  expect(content).toContain(
    "group bg-(--aui-suggestion) inset-ring inset-ring-(--aui-suggestion-border) hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--aui-suggestion))] focus-visible:ring-ring/50",
  );
  expect(content).toContain(
    "border-(--aui-suggestion-border) bg-(--aui-suggestion) hover:bg-[color-mix(in_oklab,var(--foreground)_3%,var(--aui-suggestion))] rounded-md border",
  );
});

it("keeps the kit defaults when optional colors are unset", () => {
  const registry = generateRegistryJson({
    ...DEFAULT_CONFIG,
    components: THEMED_COMPONENTS,
  });
  const content = registry.files[0]?.content ?? "";

  expect(registry.cssVars).toEqual({
    light: { "--aui-accent": "#0ea5e9", "--aui-accent-foreground": "#000000" },
    dark: { "--aui-accent": "#0ea5e9", "--aui-accent-foreground": "#000000" },
  });
  expect(new Set(content.match(/--aui-[a-z-]+/g))).toEqual(
    new Set(["--aui-accent", "--aui-accent-foreground"]),
  );
  expect(content).toContain(
    '"--composer-bg": "color-mix(in oklab, var(--muted) 30%, transparent)"',
  );
  expect(content).toContain(
    "border-foreground/10 focus-within:border-foreground/25 flex w-full cursor-text",
  );
  expect(content).toContain(
    "border-foreground/10 focus-within:border-foreground/25 ml-auto flex w-full max-w-[85%]",
  );
  expect(content).toContain(
    "rounded-[var(--composer-radius)] bg-muted px-4 py-2",
  );
  expect(content).toContain("break-words px-2 leading-relaxed");
  expect(content.match(/rounded-full bg-primary\/10/g)).toHaveLength(2);
  expect(content).toContain(
    "group hover:bg-foreground/[0.03] focus-visible:ring-ring/50",
  );
  expect(content).toContain(
    "border-foreground/10 hover:border-foreground/25 hover:bg-foreground/[0.03] rounded-md border",
  );
});

const USER_AVATAR_COMPONENTS = {
  ...DEFAULT_CONFIG.components,
  avatar: true,
  attachments: true,
  branchPicker: true,
  editMessage: true,
};

it("renders the user avatar above a right aligned message and keeps the branch picker below it", () => {
  const content =
    generateRegistryJson({
      ...DEFAULT_CONFIG,
      components: USER_AVATAR_COMPONENTS,
    }).files[0]?.content ?? "";

  expect(content).toContain(`      <UserMessageAttachments />
      <div className="col-start-2 flex justify-end">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <UserIcon className="size-4" />
        </div>
      </div>`);
  expect(content).toContain(
    "absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2",
  );
  expect(content).toContain(
    '<BranchPicker className="col-span-full col-start-1 row-start-4 -mr-1 justify-end" />',
  );
});

it.each([
  [{ attachments: true, avatar: false }, 3],
  [{ attachments: false, avatar: true }, 3],
  [{ attachments: false, avatar: false }, 2],
])("places the branch picker after the rows %o occupy", (components, row) => {
  const content =
    generateRegistryJson({
      ...DEFAULT_CONFIG,
      components: { ...USER_AVATAR_COMPONENTS, ...components },
    }).files[0]?.content ?? "";

  expect(content).toContain(`row-start-${row} -mr-1 justify-end`);
});

it("renders the user avatar beside a left aligned message", () => {
  const content =
    generateRegistryJson({
      ...DEFAULT_CONFIG,
      components: USER_AVATAR_COMPONENTS,
      styles: { ...DEFAULT_CONFIG.styles, userMessagePosition: "left" },
    }).files[0]?.content ?? "";

  expect(content).toContain(`    <MessagePrimitive.Root
      className="mx-auto flex w-full max-w-[var(--thread-max-width)] gap-3 px-2 py-4 fade-in slide-in-from-bottom-1 animate-in duration-150"
      data-role="user"
    >
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <UserIcon className="size-4" />
      </div>

      <div className="flex max-w-[80%] min-w-0 flex-col items-start gap-y-2 [&>*]:w-auto [&>*:empty]:hidden">
        <UserMessageAttachments />
        <div className="relative">`);
  expect(content).toContain(
    "absolute top-1/2 right-0 translate-x-full -translate-y-1/2 pl-2",
  );
  expect(content).toContain('<BranchPicker className="-mr-1 self-end" />');
  expect(content).not.toContain("grid-cols");
});

it("imports UserIcon only when the avatar renders", () => {
  const withAvatar =
    generateRegistryJson({
      ...DEFAULT_CONFIG,
      components: { ...DEFAULT_CONFIG.components, avatar: true },
    }).files[0]?.content ?? "";
  const withoutAvatar =
    generateRegistryJson(DEFAULT_CONFIG).files[0]?.content ?? "";

  expect(withAvatar).toContain('  UserIcon,\n} from "lucide-react"');
  expect(withAvatar).toContain('<UserIcon className="size-4" />');
  expect(withoutAvatar).not.toContain("UserIcon");
  expect(withoutAvatar).not.toContain("BotIcon");
});

it("places the assistant avatar beside the message body", () => {
  const withAvatar =
    generateRegistryJson({
      ...DEFAULT_CONFIG,
      components: { ...DEFAULT_CONFIG.components, avatar: true },
    }).files[0]?.content ?? "";
  const withoutAvatar =
    generateRegistryJson(DEFAULT_CONFIG).files[0]?.content ?? "";

  expect(withAvatar).toContain(`      <div className="flex gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <BotIcon className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="break-words px-2 leading-relaxed text-foreground">`);
  expect(withAvatar).toContain(
    `          <div className="mt-1 ml-2 flex min-h-6 items-center">`,
  );
  expect(withoutAvatar).not.toContain("flex gap-3");
  expect(withoutAvatar).toContain(`    >
      <div className="break-words px-2 leading-relaxed text-foreground">`);
});
