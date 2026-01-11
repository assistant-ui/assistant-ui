"use client";

import { useState } from "react";
import ShikiHighlighter from "react-shiki";
import { CheckIcon, CopyIcon, TerminalIcon, CodeIcon } from "lucide-react";

import type { BuilderConfig } from "./types";
import { configMatchesPreset } from "./presets";
import { encodeConfig } from "@/lib/playground-url-state";
import { cn } from "@/lib/utils";

interface BuilderCodeOutputProps {
  config: BuilderConfig;
}

export function BuilderCodeOutput({ config }: BuilderCodeOutputProps) {
  const [activeTab, setActiveTab] = useState<"code" | "cli">("code");
  const [copied, setCopied] = useState(false);

  const componentCode = generateComponentCode(config);
  const cliCommand = generateCliCommand(config);

  const handleCopy = async () => {
    const text = activeTab === "code" ? componentCode : cliCommand;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("code")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
              activeTab === "code"
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <CodeIcon className="size-3.5" />
            Code
          </button>
          <button
            onClick={() => setActiveTab("cli")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
              activeTab === "cli"
                ? "bg-foreground/10 text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TerminalIcon className="size-3.5" />
            CLI
          </button>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:text-foreground"
        >
          {copied ? (
            <>
              <CheckIcon className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <CopyIcon className="size-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto text-xs leading-relaxed [&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:p-0!">
        <ShikiHighlighter
          language={activeTab === "code" ? "tsx" : "bash"}
          theme={{ dark: "vitesse-dark", light: "vitesse-light" }}
          addDefaultStyles={false}
          showLanguage={false}
          defaultColor="light-dark()"
        >
          {activeTab === "code" ? componentCode.trim() : cliCommand.trim()}
        </ShikiHighlighter>
      </div>
    </div>
  );
}

function generateComponentCode(config: BuilderConfig): string {
  const { components, styles } = config;

  const iconImports = generateIconImports(config);

  const externalImports = [
    iconImports,
    `import {`,
    `  ActionBarPrimitive,`,
    `  AssistantIf,`,
    components.branchPicker && `  BranchPickerPrimitive,`,
    `  ComposerPrimitive,`,
    `  ErrorPrimitive,`,
    `  MessagePrimitive,`,
    `  ThreadPrimitive,`,
    `} from "@assistant-ui/react";`,
    components.markdown &&
      components.typingIndicator === "dot" &&
      `import "@assistant-ui/react-markdown/styles/dot.css";`,
  ]
    .filter(Boolean)
    .join("\n");

  const internalImports = [
    `import { Button } from "@/components/ui/button";`,
    `import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";`,
    components.markdown &&
      `import { MarkdownText } from "@/components/assistant-ui/markdown-text";`,
    components.markdown &&
      `import { ToolFallback } from "@/components/assistant-ui/tool-fallback";`,
    components.attachments &&
      `import {
  ComposerAddAttachment,
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/attachment";`,
    `import { cn } from "@/lib/utils";`,
  ]
    .filter(Boolean)
    .join("\n");

  const borderRadiusClass = getBorderRadiusClass(styles.borderRadius);
  const fontSizeClass = getFontSizeClass(styles.fontSize);
  const messageSpacingClass = getMessageSpacingClass(styles.messageSpacing);
  const accentColor = styles.colors.accent.light;
  const accentForeground = isLightColor(accentColor) ? "#000000" : "#ffffff";

  const cssVariables = `
    "--thread-max-width": "${styles.maxWidth}",
    "--accent-color": "${accentColor}",
    "--accent-foreground": "${accentForeground}",`;

  const fontFamilyStyle =
    styles.fontFamily !== "system-ui"
      ? `\n    fontFamily: "${styles.fontFamily}",`
      : "";

  const threadComponent = `
export function Thread() {
  return (
    <ThreadPrimitive.Root
      className="flex h-full flex-col bg-background ${fontSizeClass}"
      style={{${cssVariables}${fontFamilyStyle}
      }}
    >
      <ThreadPrimitive.Viewport
        turnAnchor="top"
        className="relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth px-4 pt-4"
      >
        ${
          components.threadWelcome
            ? `<AssistantIf condition={({ thread }) => thread.isEmpty}>
          <ThreadWelcome />
        </AssistantIf>`
            : ""
        }

        <ThreadPrimitive.Messages
          components={{
            UserMessage,${
              components.editMessage
                ? `
            EditComposer,`
                : ""
            }
            AssistantMessage,
          }}
        />

        <ThreadPrimitive.ViewportFooter className="sticky bottom-0 mx-auto mt-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 overflow-visible rounded-t-3xl bg-background pb-4">
          ${components.scrollToBottom ? "<ThreadScrollToBottom />" : ""}
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}`;

  const welcomeComponent = components.threadWelcome
    ? `
function ThreadWelcome() {
  return (
    <div className="mx-auto my-auto flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
      <div className="flex w-full flex-grow flex-col items-center justify-center">
        <div className="flex size-full flex-col justify-center px-8">
          <div className="text-2xl font-semibold">Hello there!</div>
          <div className="text-2xl text-muted-foreground/65">
            How can I help you today?
          </div>
        </div>
      </div>
      ${
        components.suggestions
          ? `<div className="grid w-full gap-2 pb-4 md:grid-cols-2">
        {/* Add your suggestions here */}
        <ThreadPrimitive.Suggestion prompt="What's the weather in San Francisco?" asChild>
          <Button variant="ghost" className="h-auto w-full flex-col items-start justify-start gap-1 border ${borderRadiusClass} px-5 py-4 text-left text-sm">
            <span className="font-medium">What's the weather</span>
            <span className="text-muted-foreground">in San Francisco?</span>
          </Button>
        </ThreadPrimitive.Suggestion>
        <ThreadPrimitive.Suggestion prompt="Explain React hooks like useState" asChild>
          <Button variant="ghost" className="h-auto w-full flex-col items-start justify-start gap-1 border ${borderRadiusClass} px-5 py-4 text-left text-sm">
            <span className="font-medium">Explain React hooks</span>
            <span className="text-muted-foreground">like useState</span>
          </Button>
        </ThreadPrimitive.Suggestion>
      </div>`
          : ""
      }
    </div>
  );
}`
    : "";

  const composerComponent = `
function Composer() {
  return (
    <ComposerPrimitive.Root className="relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone className="flex w-full flex-col ${borderRadiusClass} border border-input bg-background px-1 pt-2 outline-none transition-shadow has-[textarea:focus-visible]:border-ring has-[textarea:focus-visible]:ring-2 has-[textarea:focus-visible]:ring-ring/20 data-[dragging=true]:border-ring data-[dragging=true]:border-dashed data-[dragging=true]:bg-accent/50">
        ${components.attachments ? "<ComposerAttachments />" : ""}
        <ComposerPrimitive.Input
          placeholder="Send a message..."
          className="mb-1 max-h-32 min-h-14 w-full resize-none bg-transparent px-4 pt-2 pb-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-0"
          rows={1}
          autoFocus
          aria-label="Message input"
        />
        <ComposerAction />
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

function ComposerAction() {
  return (
    <div className="relative mx-2 mb-2 flex items-center justify-between">
      ${components.attachments ? "<ComposerAddAttachment />" : "<div />"}

      <AssistantIf condition={({ thread }) => !thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send message"
            side="bottom"
            type="submit"
            variant="default"
            size="icon"
            className="size-8 rounded-full"
            style={{
              backgroundColor: "var(--accent-color)",
              color: "var(--accent-foreground)",
            }}
            aria-label="Send message"
          >
            <ArrowUpIcon className="size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AssistantIf>

      <AssistantIf condition={({ thread }) => thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className="size-8 rounded-full"
            style={{
              backgroundColor: "var(--accent-color)",
              color: "var(--accent-foreground)",
            }}
            aria-label="Stop generating"
          >
            <SquareIcon className="size-3 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AssistantIf>
    </div>
  );
}`;

  const scrollToBottomComponent = components.scrollToBottom
    ? `
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
}`
    : "";

  const animationClass = styles.animations
    ? " fade-in slide-in-from-bottom-1 animate-in duration-150"
    : "";

  const userMessageComponent = `
function UserMessage() {
  return (
    <MessagePrimitive.Root
      className="mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2 ${messageSpacingClass}${animationClass}"
      data-role="user"
    >
      ${components.attachments ? "<UserMessageAttachments />" : ""}

      <div className="relative col-start-2 min-w-0">
        <div className="${borderRadiusClass} bg-muted px-4 py-2.5 break-words text-foreground">
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

  const assistantMessageRootClass = `relative mx-auto w-full max-w-[var(--thread-max-width)] ${messageSpacingClass}${animationClass}`;
  const textComponent = components.markdown ? "MarkdownText" : "undefined";

  const reasoningSection = components.reasoning
    ? `
        {/* Reasoning/Thinking Section */}
        <div className="mb-3 overflow-hidden rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30">
          <details className="group">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/50">
              <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
              <span className="font-medium">Thinking...</span>
            </summary>
            <div className="border-t border-dashed border-muted-foreground/30 px-3 py-2 text-sm italic text-muted-foreground">
              {/* Reasoning content will be displayed here */}
            </div>
          </details>
        </div>`
    : "";

  const assistantMessageComponent = `
function AssistantMessage() {
  return (
    <MessagePrimitive.Root
      className="${assistantMessageRootClass}"
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
            ${components.markdown ? `Text: ${textComponent},` : ""}
            ${components.markdown ? `tools: { Fallback: ToolFallback },` : ""}
          }}
        />
        <MessageError />${
          components.loadingIndicator !== "none"
            ? `
        <AssistantIf condition={({ thread, message }) => thread.isRunning && message.content.length === 0}>
          <div className="flex items-center gap-2 text-muted-foreground">
            <LoaderIcon className="size-4 animate-spin" />${
              components.loadingIndicator === "text"
                ? `
            <span className="text-sm">${components.loadingText}</span>`
                : ""
            }
          </div>
        </AssistantIf>`
            : ""
        }
      </div>

      <div className="mt-1 ml-2 flex">
        ${components.branchPicker ? "<BranchPicker />" : ""}
        <AssistantActionBar />
      </div>
      ${
        components.followUpSuggestions
          ? `
      <AssistantIf condition={({ thread }) => !thread.isRunning}>
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
      </AssistantIf>`
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

  const actionBarComponent = `
function AssistantActionBar() {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="-ml-1 flex gap-1 text-muted-foreground data-floating:absolute data-floating:rounded-md data-floating:border data-floating:bg-background data-floating:p-1 data-floating:shadow-sm"
    >
      ${
        components.actionBar.copy
          ? `<ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <AssistantIf condition={({ message }) => message.isCopied}>
            <CheckIcon />
          </AssistantIf>
          <AssistantIf condition={({ message }) => !message.isCopied}>
            <CopyIcon />
          </AssistantIf>
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

  const branchPickerComponent = components.branchPicker
    ? `
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
}`
    : "";

  const editComposerComponent = components.editMessage
    ? `
function EditComposer() {
  return (
    <MessagePrimitive.Root className="mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col px-2 py-3">
      <ComposerPrimitive.Root className="ml-auto flex w-full max-w-[85%] flex-col ${borderRadiusClass} bg-muted">
        <ComposerPrimitive.Input
          className="min-h-14 w-full resize-none bg-transparent p-4 text-foreground text-sm outline-none"
          autoFocus
        />
        <div className="mx-3 mb-3 flex items-center gap-2 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button variant="ghost" size="sm">Cancel</Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm">Update</Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
}`
    : "";

  const allImports = `"use client";

${externalImports}

${internalImports}`;

  return [
    allImports,
    threadComponent,
    welcomeComponent,
    composerComponent,
    scrollToBottomComponent,
    userMessageComponent,
    editComposerComponent,
    assistantMessageComponent,
    actionBarComponent,
    branchPickerComponent,
  ]
    .filter(Boolean)
    .join("\n");
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

function getBorderRadiusClass(radius: string): string {
  return (
    {
      none: "rounded-none",
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
      full: "rounded-3xl",
    }[radius] || "rounded-lg"
  );
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

/**
 * Determines if a hex color is light (should use dark text) or dark (should use light text)
 */
function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

function generateCliCommand(config: BuilderConfig): string {
  const { components } = config;

  const matchingPreset = configMatchesPreset(config);
  const baseUrl = "https://www.assistant-ui.com/playground/init";
  const presetUrl = matchingPreset
    ? `${baseUrl}?preset=${matchingPreset.id}`
    : `${baseUrl}?c=${encodeConfig(config)}`;

  const componentsToAdd: string[] = ["thread"];

  if (components.markdown) {
    componentsToAdd.push("markdown-text");
  }

  componentsToAdd.push("tooltip-icon-button");

  if (components.attachments) {
    componentsToAdd.push("attachment");
  }

  const addCommand =
    componentsToAdd.length > 0
      ? `npx assistant-ui@latest add ${componentsToAdd.join(" ")}`
      : "";

  const featureNotes: string[] = [];

  if (components.reasoning) {
    featureNotes.push(
      "# Note: Reasoning/thinking display is included in the code above",
    );
  }

  if (components.actionBar.speak) {
    featureNotes.push("# Note: Text-to-speech requires browser API support");
  }

  if (components.actionBar.feedback) {
    featureNotes.push(
      "# Note: Feedback buttons require backend integration to store user feedback",
    );
  }

  return `# ─────────────────────────────────────────────────────────────────
# One-command setup with your configuration:
# ─────────────────────────────────────────────────────────────────
npx assistant-ui@latest init --preset "${presetUrl}"

# Or use shadcn directly:
npx shadcn@latest add "${presetUrl}"

# ─────────────────────────────────────────────────────────────────
# Manual setup (alternative):
# ─────────────────────────────────────────────────────────────────

# Step 1: Initialize assistant-ui in your project
npx assistant-ui@latest init

# Step 2: Add the required components
${addCommand}

# Step 3: Copy the generated code above and paste it into your thread.tsx file
# The code is customized based on your playground configuration

${featureNotes.length > 0 ? `${featureNotes.join("\n")}\n` : ""}
# Configuration Summary:
# - Theme: ${config.styles.theme}
# - Accent Color: ${config.styles.colors.accent.light} (light) / ${config.styles.colors.accent.dark} (dark)
# - Border Radius: ${config.styles.borderRadius}
# - Font: ${config.styles.fontFamily}
# - Font Size: ${config.styles.fontSize}
# - Message Spacing: ${config.styles.messageSpacing}
# - User Message Position: ${config.styles.userMessagePosition}
# - Animations: ${config.styles.animations ? "enabled" : "disabled"}
#
# Components enabled:
# - Attachments: ${components.attachments ? "yes" : "no"}
# - Branch Picker: ${components.branchPicker ? "yes" : "no"}
# - Edit Messages: ${components.editMessage ? "yes" : "no"}
# - Welcome Screen: ${components.threadWelcome ? "yes" : "no"}
# - Suggestions: ${components.suggestions ? "yes" : "no"}
# - Scroll to Bottom: ${components.scrollToBottom ? "yes" : "no"}
# - Markdown: ${components.markdown ? "yes" : "no"}
# - Reasoning: ${components.reasoning ? "yes" : "no"}
# - Follow-up Suggestions: ${components.followUpSuggestions ? "yes" : "no"}
# - Avatar: ${components.avatar ? "yes" : "no"}
# - Typing Indicator: ${components.typingIndicator}
# - Loading: ${components.loadingIndicator}${components.loadingIndicator === "text" ? ` ("${components.loadingText}")` : ""}
# - Action Bar Copy: ${components.actionBar.copy ? "yes" : "no"}
# - Action Bar Reload: ${components.actionBar.reload ? "yes" : "no"}
# - Action Bar Speak: ${components.actionBar.speak ? "yes" : "no"}
# - Action Bar Feedback: ${components.actionBar.feedback ? "yes" : "no"}`;
}
