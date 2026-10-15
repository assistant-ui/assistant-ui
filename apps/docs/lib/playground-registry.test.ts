import { expect, it } from "vitest";
import {
  type BorderRadius,
  DEFAULT_CONFIG,
  type FontSize,
} from "../components/pages/playground/types";
import { generateRegistryJson } from "./playground-registry";
import { decodeConfig } from "./playground-config-codec";

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
      `["--composer-radius" as string]: "${radius}"`,
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

  expect(registry.files[0]?.content).toContain(
    '["--composer-radius" as string]: "0.5rem"',
  );
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
  expect(content).toContain(
    '["--background" as string]: "var(--aui-background)"',
  );
  expect(content).toContain(
    '["--foreground" as string]: "var(--aui-foreground)"',
  );
  expect(content).toContain('["--muted" as string]: "var(--aui-muted)"');
  expect(content).toContain(
    '["--muted-foreground" as string]: "var(--aui-muted-foreground)"',
  );
  expect(content).toContain('["--border" as string]: "var(--aui-border)"');
  expect(content).toContain(
    '["--composer-bg" as string]: "var(--aui-composer)"',
  );
  expect(content).toContain(
    '["--accent-color" as string]: "var(--aui-accent)"',
  );
  expect(content).toContain(
    "border-[color-mix(in_oklab,var(--aui-border)_60%,transparent)] focus-within:border-(--aui-border) flex w-full cursor-text",
  );
  expect(content).toContain(
    "border-(--aui-border) ms-auto flex w-full max-w-[85%] cursor-text",
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
    '["--composer-bg" as string]: "color-mix(in oklab, var(--muted) 30%, transparent)"',
  );
  expect(content).toContain(
    "border-foreground/10 focus-within:border-foreground/25 flex w-full cursor-text",
  );
  expect(content).toContain(
    "border-foreground/10 focus-within:border-foreground/25 ms-auto flex w-full max-w-[85%] cursor-text",
  );
  expect(content).toContain(
    "rounded-[var(--composer-radius)] bg-muted px-4 py-2",
  );
  expect(content).toContain("break-words leading-relaxed text-foreground");
  expect(content.match(/rounded-full bg-primary\/10/g)).toHaveLength(2);
  expect(content).toContain(
    "group hover:bg-foreground/[0.03] focus-visible:ring-ring/50",
  );
  expect(content).toContain(
    "border-foreground/10 hover:border-foreground/25 hover:bg-foreground/[0.03] rounded-md border",
  );
});

const userMessageBlock = (code: string) => {
  const start = code.indexOf("function UserMessage()");
  const end = code.indexOf("\nfunction ", start + 1);
  return code.slice(start, end === -1 ? undefined : end);
};

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
    '<BranchPicker className="col-span-full col-start-1 -mr-1 justify-end" />',
  );
});

it.each([
  { attachments: true, avatar: false },
  { attachments: false, avatar: true },
  { attachments: false, avatar: false },
])("auto-places the branch picker for %o", (components) => {
  const content =
    generateRegistryJson({
      ...DEFAULT_CONFIG,
      components: { ...USER_AVATAR_COMPONENTS, ...components },
    }).files[0]?.content ?? "";

  const userMessage = userMessageBlock(content);

  expect(userMessage).toContain(
    '<BranchPicker className="col-span-full col-start-1 -mr-1 justify-end" />',
  );
  expect(userMessage).not.toContain("row-start-");
});

it("renders the user avatar beside a left aligned message", () => {
  const content =
    generateRegistryJson({
      ...DEFAULT_CONFIG,
      components: USER_AVATAR_COMPONENTS,
      styles: { ...DEFAULT_CONFIG.styles, userMessagePosition: "left" },
    }).files[0]?.content ?? "";

  expect(content).toContain(`    <MessagePrimitive.Root
      className="mx-auto flex w-full max-w-[var(--thread-max-width)] gap-3 px-2 fade-in slide-in-from-bottom-1 animate-in duration-150"
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
          <div className="break-words leading-relaxed text-foreground">`);
  expect(withAvatar).toContain(
    `          <div className="mt-1 ml-2 flex min-h-6 items-center">`,
  );
  expect(withoutAvatar).not.toContain("flex gap-3");
  expect(withoutAvatar).toContain(`    >
      <div className="break-words leading-relaxed text-foreground">`);
  expect(withAvatar).toContain(
    'className="relative mx-auto w-full max-w-[var(--thread-max-width)] px-2 fade-in slide-in-from-bottom-1 animate-in duration-150"\n      data-role="assistant"',
  );
});

it.each([
  ["compact", "gap-y-4"],
  ["comfortable", "gap-y-6"],
  ["spacious", "gap-y-8"],
] as const)("uses %s spacing between messages", (messageSpacing, gap) => {
  const content =
    generateRegistryJson({
      ...DEFAULT_CONFIG,
      styles: { ...DEFAULT_CONFIG.styles, messageSpacing },
    }).files[0]?.content ?? "";

  expect(content).toContain(
    `className="mb-14 flex flex-col ${gap} empty:hidden"`,
  );
  expect(content).toContain(
    'className="mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 fade-in',
  );
  expect(content).toContain(
    'className="relative mx-auto w-full max-w-[var(--thread-max-width)] px-2 fade-in',
  );
  expect(content).not.toMatch(
    /<MessagePrimitive.Root\s+className="[^"]* px-2 py-[246]/,
  );
});

it("falls back to comfortable spacing for an unknown decoded value", () => {
  const config = decodeConfig(
    Buffer.from(
      JSON.stringify({ styles: { messageSpacing: "legacy" } }),
    ).toString("base64url"),
  );
  const content = generateRegistryJson(config).files[0]?.content ?? "";

  expect(content).toContain(
    'className="mb-14 flex flex-col gap-y-6 empty:hidden"',
  );
  expect(content).not.toContain("undefined");
});

it("renders reasoning parts only when reasoning is enabled", () => {
  const config = {
    ...DEFAULT_CONFIG,
    components: {
      ...DEFAULT_CONFIG.components,
      reasoning: true,
      loadingIndicator: "none" as const,
    },
  };
  const onRegistry = generateRegistryJson(config);
  const offRegistry = generateRegistryJson({
    ...config,
    components: { ...config.components, reasoning: false },
  });
  const on = onRegistry.files[0]?.content ?? "";
  const off = offRegistry.files[0]?.content ?? "";

  expect(onRegistry.registryDependencies).toContain(
    "https://r.assistant-ui.com/base/reasoning.json",
  );
  expect(on).toContain(
    'from "@/components/assistant-ui/elements/reasoning.aui"',
  );
  expect(on).toContain("<MessagePrimitive.GroupedParts");
  expect(on).toContain('reasoning: ["group-reasoning"]');
  expect(on.match(/<ReasoningRoot\b/g)).toHaveLength(1);
  expect(on).toContain(
    '<ReasoningRoot variant="muted" className="mb-0" streaming={running}>',
  );
  expect(on).toContain("<ReasoningTrigger active={running} />");
  expect(on).toContain("<ReasoningContent aria-busy={running}>");
  expect(on).toContain("<ReasoningText>{children}</ReasoningText>");
  expect(on).toContain(
    'case "reasoning":\n                return <Reasoning {...part} />;',
  );
  expect(on).toContain('case "text":');
  expect(on).toContain('case "tool-call":');
  expect(on).toContain('case "image":');
  expect(on).toContain('case "data":');
  expect(on).not.toContain("Thinking...");
  expect(on).not.toContain("ChevronDownIcon");
  expect(on).not.toContain("ReasoningGroup");
  expect(on).not.toContain("ReasoningPart");
  expect(offRegistry.registryDependencies).not.toContain(
    "https://r.assistant-ui.com/base/reasoning.json",
  );
  expect(off).not.toContain("reasoning.aui");
  expect(off).toContain(
    "<MessagePrimitive.Parts components={{ Text: MarkdownText, tools: { Fallback: ToolFallback } }} />",
  );
  expect(off).not.toContain("GroupedParts");
});

it("renders source parts only when sources are enabled", () => {
  const config = {
    ...DEFAULT_CONFIG,
    components: { ...DEFAULT_CONFIG.components, sources: true },
  };
  const onRegistry = generateRegistryJson(config);
  const offRegistry = generateRegistryJson(DEFAULT_CONFIG);
  const on = onRegistry.files[0]?.content ?? "";
  const off = offRegistry.files[0]?.content ?? "";

  expect(onRegistry.registryDependencies).toContain(
    "https://r.assistant-ui.com/base/sources.json",
  );
  expect(on).toContain(
    'import { Sources } from "@/components/assistant-ui/elements/sources.aui";',
  );
  expect(on).toContain('source: ["group-source"]');
  expect(on).toContain(
    '<div className="mt-2 flex flex-wrap gap-1.5">{children}</div>',
  );
  expect(on).toContain(
    'case "source":\n                return <Sources {...part} />;',
  );
  expect(offRegistry.registryDependencies).not.toContain(
    "https://r.assistant-ui.com/base/sources.json",
  );
  expect(off).not.toContain("sources.aui");
  expect(off).not.toContain("group-source");
});

it.each([
  { reasoning: true, sources: false, markdown: true },
  { reasoning: true, sources: false, markdown: false },
  { reasoning: true, sources: true, markdown: true },
  { reasoning: true, sources: true, markdown: false },
  { reasoning: false, sources: true, markdown: true },
  { reasoning: false, sources: true, markdown: false },
])("preserves other parts in grouped output for %o", (toggles) => {
  const content =
    generateRegistryJson({
      ...DEFAULT_CONFIG,
      components: { ...DEFAULT_CONFIG.components, ...toggles },
    }).files[0]?.content ?? "";

  expect(content).toContain("<MessagePrimitive.GroupedParts");
  expect(content).toContain("return <MessagePartPrimitive.Image />;");
  expect(content).toContain("return part.dataRendererUI;");
  expect(content).toContain('case "indicator":');
  if (toggles.markdown) {
    expect(content).toContain("return <MarkdownText />;");
    expect(content).toContain(
      "return part.toolUI ?? <ToolFallback {...part} />;",
    );
  } else {
    expect(content).toContain('<p style={{ whiteSpace: "pre-line" }}>');
    expect(content).toContain("<MessagePartPrimitive.InProgress>");
    expect(content).toContain("return part.toolUI;");
    expect(content).not.toContain("ToolFallback");
  }
  expect(content.includes('case "group-reasoning":')).toBe(toggles.reasoning);
  expect(content.includes('case "group-source":')).toBe(toggles.sources);
});

it("matches the welcome and edit composer shown in the preview", () => {
  const content = generateRegistryJson(DEFAULT_CONFIG).files[0]?.content ?? "";

  expect(content).toContain(
    '<p className="text-2xl font-medium tracking-tight fade-in slide-in-from-bottom-1 animate-in fill-mode-both duration-200">How can I help you today?</p>',
  );
  expect(content).not.toContain("<h1");
  expect(content).toContain(
    '<MessagePrimitive.Root className="mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col px-2">',
  );
  expect(content).toContain(
    "ms-auto flex w-full max-w-[85%] cursor-text flex-col rounded-[var(--composer-radius)]",
  );
  expect(content).not.toContain("ml-auto flex w-full max-w-[85%]");
});

it("omits an empty part map", () => {
  const content =
    generateRegistryJson({
      ...DEFAULT_CONFIG,
      components: { ...DEFAULT_CONFIG.components, markdown: false },
    }).files[0]?.content ?? "";

  expect(content).toContain("<MessagePrimitive.Parts />");
  expect(content).not.toContain("<MessagePrimitive.Parts components={{");
});

it.each(["dot", "none"] as const)(
  "renders the grouped empty-run indicator only for the dot typing indicator (%s)",
  (typingIndicator) => {
    const content =
      generateRegistryJson({
        ...DEFAULT_CONFIG,
        components: {
          ...DEFAULT_CONFIG.components,
          reasoning: true,
          typingIndicator,
        },
      }).files[0]?.content ?? "";

    expect(content.includes('case "indicator":')).toBe(
      typingIndicator === "dot",
    );
  },
);
