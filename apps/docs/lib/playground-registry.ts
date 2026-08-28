import type { BuilderConfig } from "@/components/pages/playground/types";

const REGISTRY_BASE_URL = "https://r.assistant-ui.com";

export function determineRegistryDependencies(config: BuilderConfig): string[] {
  const { components } = config;
  const deps: string[] = [
    "button",
    `${REGISTRY_BASE_URL}/base/tooltip-icon-button.json`,
  ];

  if (components.markdown) {
    deps.push(`${REGISTRY_BASE_URL}/markdown-text.json`);
    deps.push(`${REGISTRY_BASE_URL}/tool-fallback.json`);
  }

  if (components.attachments) {
    deps.push(`${REGISTRY_BASE_URL}/base/attachment.json`);
  }

  return deps;
}

export function generateCssVars(
  config: BuilderConfig,
  mode: "light" | "dark",
): Record<string, string> {
  const { styles } = config;
  const vars: Record<string, string> = {};

  const accentColor =
    mode === "light" ? styles.colors.accent.light : styles.colors.accent.dark;
  vars["--aui-accent"] = accentColor;
  vars["--aui-accent-foreground"] = isLightColor(accentColor)
    ? "#000000"
    : "#ffffff";

  if (styles.colors.background) {
    vars["--aui-background"] =
      mode === "light"
        ? styles.colors.background.light
        : styles.colors.background.dark;
  }

  if (styles.colors.foreground) {
    vars["--aui-foreground"] =
      mode === "light"
        ? styles.colors.foreground.light
        : styles.colors.foreground.dark;
  }

  if (styles.colors.muted) {
    vars["--aui-muted"] =
      mode === "light" ? styles.colors.muted.light : styles.colors.muted.dark;
  }

  if (styles.colors.mutedForeground) {
    vars["--aui-muted-foreground"] =
      mode === "light"
        ? styles.colors.mutedForeground.light
        : styles.colors.mutedForeground.dark;
  }

  if (styles.colors.border) {
    vars["--aui-border"] =
      mode === "light" ? styles.colors.border.light : styles.colors.border.dark;
  }

  if (styles.colors.userMessage) {
    vars["--aui-user-message"] =
      mode === "light"
        ? styles.colors.userMessage.light
        : styles.colors.userMessage.dark;
  }

  if (styles.colors.composer) {
    vars["--aui-composer"] =
      mode === "light"
        ? styles.colors.composer.light
        : styles.colors.composer.dark;
  }

  vars["--aui-max-width"] = styles.maxWidth;
  vars["--aui-border-radius"] = getBorderRadiusValue(styles.borderRadius);
  vars["--aui-font-family"] = styles.fontFamily;

  return vars;
}

function getBorderRadiusValue(radius: string): string {
  const map: Record<string, string> = {
    none: "0",
    sm: "0.125rem",
    md: "0.375rem",
    lg: "0.5rem",
    full: "1.5rem",
  };
  return map[radius] || "0.5rem";
}

function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export function generateRegistryJson(config: BuilderConfig) {
  const registryDependencies = determineRegistryDependencies(config);
  const threadCode = generateThreadCode(config);

  return {
    name: "assistant-ui-thread",
    type: "registry:block",
    dependencies: [
      "@assistant-ui/react",
      "@assistant-ui/react-ui",
      "lucide-react",
      ...(config.components.markdown ? ["@assistant-ui/react-markdown"] : []),
    ],
    registryDependencies,
    files: [
      {
        path: "components/assistant-ui/elements/thread.aui.tsx",
        content: threadCode,
        type: "registry:component",
      },
    ],
    cssVars: {
      light: generateCssVars(config, "light"),
      dark: generateCssVars(config, "dark"),
    },
  };
}

function generateThreadCode(config: BuilderConfig): string {
  const { components, styles } = config;

  const externalImports = [
    generateIconImports(config),
    `import {`,
    `  ActionBarPrimitive,`,
    `  AuiIf,`,
    components.branchPicker ? `  BranchPickerPrimitive,` : null,
    `  ComposerPrimitive,`,
    `  ErrorPrimitive,`,
    `  MessagePrimitive,`,
    `  ThreadPrimitive,`,
    `  useAuiState,`,
    `} from "@assistant-ui/react";`,
    components.markdown && components.typingIndicator === "dot"
      ? `import "@assistant-ui/react-markdown/styles/dot.css";`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  const internalImports = [
    `import { Button } from "@/components/ui/button";`,
    `import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";`,
    components.markdown
      ? `import { MarkdownText } from "@/components/assistant-ui/elements/markdown-text";`
      : null,
    components.markdown
      ? `import { ToolFallback } from "@/components/assistant-ui/elements/tool-fallback.aui";`
      : null,
    components.attachments
      ? `import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/elements/attachment.aui";`
      : null,
    `import { cn } from "@/lib/utils";`,
  ]
    .filter(Boolean)
    .join("\n");

  const imports = `"use client";

${externalImports}

${internalImports}`;

  const fontSizeClass = getFontSizeClass(styles.fontSize);
  const messageSpacingClass = getMessageSpacingClass(styles.messageSpacing);
  const accentColor = styles.colors.accent.light;
  const accentForeground = isLightColor(accentColor) ? "#000000" : "#ffffff";

  const composerRadius = getBorderRadiusValue(styles.borderRadius);

  const threadComponent = `
export function Thread() {
  const isEmpty = useAuiState((s) => s.thread.isEmpty);

  return (
    <ThreadPrimitive.Root
      className="flex h-full flex-col bg-background ${fontSizeClass}"
      style={{
        "--thread-max-width": "${styles.maxWidth}",
        "--composer-radius": "${composerRadius}",
        "--composer-padding": "8px",
        "--composer-bg": "var(--color-card)",
        "--accent-color": "${accentColor}",
        "--accent-foreground": "${accentForeground}",${styles.fontFamily !== "system-ui" ? `\n        fontFamily: "${styles.fontFamily}",` : ""}
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-[var(--thread-max-width)] flex-1 flex-col px-4 pt-4",
            isEmpty && "justify-center",
          )}
        >
          ${
            components.threadWelcome
              ? `<AuiIf condition={(s) => s.thread.isEmpty}>
            <ThreadWelcome />
          </AuiIf>`
              : ""
          }

          <div className="mb-14 flex flex-col gap-y-6 empty:hidden">
            <ThreadPrimitive.Messages
              components={{
                UserMessage,${components.editMessage ? `\n                EditComposer,` : ""}
                AssistantMessage,
              }}
            />
          </div>

          <ThreadPrimitive.ViewportFooter
            className={cn(
              "flex w-full flex-col gap-4 overflow-visible bg-background pb-4",
              !isEmpty && "sticky bottom-0 mt-auto rounded-t-[var(--composer-radius)]",
            )}
          >
            ${components.scrollToBottom ? "<ThreadScrollToBottom />" : ""}
            <Composer />
            ${
              components.suggestions
                ? `<AuiIf condition={(s) => s.thread.isEmpty && s.composer.isEmpty}>
              <ThreadSuggestions />
            </AuiIf>`
                : ""
            }
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}`;

  const additionalComponents = [
    components.threadWelcome ? generateWelcomeComponent() : "",
    components.suggestions ? generateSuggestionsComponent() : "",
    generateComposerComponent(config),
    components.scrollToBottom ? generateScrollToBottomComponent() : "",
    generateUserMessageComponent(config, messageSpacingClass),
    components.editMessage ? generateEditComposerComponent() : "",
    generateAssistantMessageComponent(config, messageSpacingClass),
    generateActionBarComponent(config),
    components.branchPicker ? generateBranchPickerComponent() : "",
  ]
    .filter(Boolean)
    .join("\n");

  return imports + threadComponent + additionalComponents;
}

function generateIconImports(config: BuilderConfig): string {
  const { components } = config;
  const icons: string[] = ["ArrowUpIcon", "DownloadIcon", "SquareIcon"];

  if (components.scrollToBottom) icons.push("ArrowDownIcon");
  if (components.editMessage) icons.push("PencilIcon");
  if (components.branchPicker)
    icons.push("ChevronLeftIcon", "ChevronRightIcon");
  if (components.actionBar.copy) icons.push("CheckIcon", "CopyIcon");
  if (components.actionBar.reload) icons.push("RefreshCwIcon");
  if (components.actionBar.speak) icons.push("Volume2Icon");
  if (components.actionBar.feedback)
    icons.push("ThumbsUpIcon", "ThumbsDownIcon");
  if (components.avatar) icons.push("BotIcon", "UserIcon");
  if (components.loadingIndicator !== "none") icons.push("LoaderIcon");
  if (components.reasoning) icons.push("ChevronDownIcon");

  return `import {\n  ${[...new Set(icons)].sort().join(",\n  ")},\n} from "lucide-react";`;
}

function getFontSizeClass(fontSize: string): string {
  return (
    {
      sm: "text-sm",
      base: "text-base",
      lg: "text-lg",
    }[fontSize] || "text-base"
  );
}

function getMessageSpacingClass(spacing: string): string {
  return (
    {
      compact: "py-2",
      comfortable: "py-4",
      spacious: "py-6",
    }[spacing] || "py-4"
  );
}

function generateWelcomeComponent(): string {
  return `
function ThreadWelcome() {
  return (
    <div className="mb-6 flex flex-col items-center px-4 text-center">
      <h1 className="text-2xl font-medium tracking-tight">How can I help you today?</h1>
    </div>
  );
}`;
}

function generateSuggestionsComponent(): string {
  return `
function ThreadSuggestions() {
  return (
    <div className="flex w-full flex-wrap items-center justify-center gap-2 px-4">
      <ThreadPrimitive.Suggestion prompt="What's the weather in San Francisco?" send asChild>
        <Button variant="ghost" className="h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap">
          What's the weather <span className="text-muted-foreground">in San Francisco?</span>
        </Button>
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion prompt="Explain React hooks like useState" send asChild>
        <Button variant="ghost" className="h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap">
          Explain React hooks <span className="text-muted-foreground">like useState</span>
        </Button>
      </ThreadPrimitive.Suggestion>
    </div>
  );
}`;
}

function generateComposerComponent(config: BuilderConfig): string {
  const { components } = config;
  return `
function Composer() {
  return (
    <ComposerPrimitive.Root className="relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div className="flex w-full cursor-text flex-col gap-2 rounded-[var(--composer-radius)] border border-border/60 bg-[var(--composer-bg)] p-[var(--composer-padding)] transition-[border-color] data-[dragging=true]:border-dashed">
          ${components.attachments ? "<ComposerAttachments />" : ""}
          <ComposerPrimitive.Input
            placeholder="Send a message..."
            className="max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base leading-6 outline-none placeholder:text-muted-foreground"
            rows={1}
            autoFocus
            enterKeyHint="send"
            aria-label="Message input"
          />
          <ComposerAction />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

function ComposerAction() {
  return (
    <div className="relative flex items-center justify-between">
      ${components.attachments ? "<ComposerAddAttachment />" : "<div />"}

      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send message"
            side="bottom"
            type="submit"
            variant="default"
            size="icon"
            className="size-7 rounded-full"
            style={{
              backgroundColor: "var(--accent-color)",
              color: "var(--accent-foreground)",
            }}
            aria-label="Send message"
          >
            <ArrowUpIcon className="size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="size-7 rounded-full"
            style={{
              backgroundColor: "var(--accent-color)",
              color: "var(--accent-foreground)",
            }}
            aria-label="Stop generating"
          >
            <SquareIcon className="size-3.5 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
}`;
}

function generateScrollToBottomComponent(): string {
  return `
function ThreadScrollToBottom() {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible"
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
}`;
}

function generateUserMessageComponent(
  config: BuilderConfig,
  messageSpacingClass: string,
): string {
  const { components, styles } = config;
  const animationClass = styles.animations
    ? " fade-in slide-in-from-bottom-1 animate-in duration-150"
    : "";

  return `
function UserMessage() {
  return (
    <MessagePrimitive.Root
      className="mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 ${messageSpacingClass}${animationClass}"
      data-role="user"
    >
      ${components.attachments ? "<UserMessageAttachments />" : ""}

      <div className="relative col-start-2 min-w-0">
        <div className="rounded-xl bg-muted px-4 py-2 break-words text-foreground">
          <MessagePrimitive.Parts />
        </div>
        ${
          components.editMessage
            ? `<div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2">
          <UserActionBar />
        </div>`
            : ""
        }
      </div>

      ${components.branchPicker ? `<BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />` : ""}
    </MessagePrimitive.Root>
  );
}

${
  components.editMessage
    ? `function UserActionBar() {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="p-4">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
}`
    : ""
}`;
}

function generateEditComposerComponent(): string {
  return `
function EditComposer() {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col px-2 py-3">
      <ComposerPrimitive.Root className="ml-auto flex w-full max-w-[85%] flex-col rounded-[var(--composer-radius)] border border-border/60 bg-[var(--composer-bg)]">
        <ComposerPrimitive.Input
          className="min-h-14 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base text-foreground outline-none"
          autoFocus
        />
        <div className="mx-2.5 mb-2.5 flex items-center gap-1.5 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm" className="h-8 rounded-full px-3.5">Cancel</Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm" className="h-8 rounded-full px-3.5">Update</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}`;
}

function generateAssistantMessageComponent(
  config: BuilderConfig,
  messageSpacingClass: string,
): string {
  const { components, styles } = config;
  const animationClass = styles.animations
    ? " fade-in slide-in-from-bottom-1 animate-in duration-150"
    : "";

  const reasoningSection = components.reasoning
    ? `
        <div className="mb-3 overflow-hidden rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">
              <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
              <span className="font-medium">Thinking...</span>
            </summary>
            <div className="border-t border-dashed border-muted-foreground/30 px-3 py-2 text-sm italic text-muted-foreground">
            </div>
          </details>
        </div>`
    : "";

  return `
function AssistantMessage() {
  return (
    <MessagePrimitive.Root
      className="relative mx-auto w-full max-w-[var(--thread-max-width)] ${messageSpacingClass}${animationClass}"
      data-role="assistant"
    >
      ${
        components.avatar
          ? `<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <BotIcon className="size-4" />
      </div>`
          : ""
      }
      <div className="break-words px-2 leading-relaxed text-foreground">${reasoningSection}
        <MessagePrimitive.Parts
          components={{
            ${components.markdown ? `Text: MarkdownText,` : ""}
            ${components.markdown ? `tools: { Fallback: ToolFallback },` : ""}
          }}
        />
        <MessageError />${
          components.loadingIndicator !== "none"
            ? `
        <AuiIf condition={(s) => s.thread.isRunning && s.message.content.length === 0}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <LoaderIcon className="size-4 animate-spin" />${
              components.loadingIndicator === "text"
                ? `
            <span className="text-sm">${components.loadingText}</span>`
                : ""
            }
          </div>
        </AuiIf>`
            : ""
        }
      </div>

      <div className="mt-1 ml-2 flex min-h-6 items-center">
        ${components.branchPicker ? "<BranchPicker />" : ""}
        <AssistantActionBar />
      </div>
      ${
        components.followUpSuggestions
          ? `
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <div className="mt-4 flex flex-wrap gap-2">
          <ThreadPrimitive.Suggestion
            prompt="Tell me more"
            className="rounded-full border bg-background px-3 py-1 text-sm hover:bg-muted"
          >
            Tell me more
          </ThreadPrimitive.Suggestion>
          <ThreadPrimitive.Suggestion
            prompt="Can you explain differently?"
            className="rounded-full border bg-background px-3 py-1 text-sm hover:bg-muted"
          >
            Explain differently
          </ThreadPrimitive.Suggestion>
        </div>
      </AuiIf>`
          : ""
      }
    </MessagePrimitive.Root>
  );
}

function MessageError() {
  return (
    <MessagePrimitive.Error>
      <ErrorPrimitive.Root className="mt-2 rounded-md border border-destructive bg-destructive/10 p-3 text-destructive text-sm dark:bg-destructive/5 dark:text-red-200">
        <ErrorPrimitive.Message className="line-clamp-2" />
      </ErrorPrimitive.Root>
    </MessagePrimitive.Error>
  );
}`;
}

function generateActionBarComponent(config: BuilderConfig): string {
  const { components } = config;

  const feedbackButtons = components.actionBar.feedback
    ? `
      <ActionBarPrimitive.FeedbackPositive asChild>
        <TooltipIconButton tooltip="Good response">
          <ThumbsUpIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.FeedbackPositive>
      <ActionBarPrimitive.FeedbackNegative asChild>
        <TooltipIconButton tooltip="Bad response">
          <ThumbsDownIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.FeedbackNegative>`
    : "";

  return `
function AssistantActionBar() {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="-ml-1 flex gap-1 text-muted-foreground"
    >
      ${
        components.actionBar.copy
          ? `<ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AuiIf condition={(s) => s.message.isCopied}>
            <CheckIcon />
          </AuiIf>
          <AuiIf condition={(s) => !s.message.isCopied}>
            <CopyIcon />
          </AuiIf>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>`
          : ""
      }
      <ActionBarPrimitive.ExportMarkdown asChild>
        <TooltipIconButton tooltip="Export as Markdown">
          <DownloadIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.ExportMarkdown>
      ${
        components.actionBar.reload
          ? `<ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Refresh">
          <RefreshCwIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Reload>`
          : ""
      }
      ${
        components.actionBar.speak
          ? `<ActionBarPrimitive.Speak asChild>
        <TooltipIconButton tooltip="Read aloud">
          <Volume2Icon />
        </TooltipIconButton>
      </ActionBarPrimitive.Speak>`
          : ""
      }${feedbackButtons}
    </ActionBarPrimitive.Root>
  );
}`;
}

function generateBranchPickerComponent(): string {
  return `
function BranchPicker({ className, ...rest }: { className?: string }) {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn("mr-2 -ml-2 inline-flex items-center text-xs text-muted-foreground", className)}
      {...rest}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="font-medium">
        <BranchPickerPrimitive.Number /> / <BranchPickerPrimitive.Count />
      </span>
      <BranchPickerPrimitive.Next asChild>
        <TooltipIconButton tooltip="Next">
          <ChevronRightIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Next>
    </BranchPickerPrimitive.Root>
  );
}`;
}
