"use client";

import { useState } from "react";
import ShikiHighlighter from "react-shiki";
import { CheckIcon, CopyIcon } from "lucide-react";

import type { BuilderConfig } from "./types";
import {
  BORDER_RADIUS_CLASS,
  FONT_SIZE_CLASS,
  MESSAGE_SPACING_CLASS,
  isLightColor,
} from "@/lib/builder-utils";
import { analytics } from "@/lib/analytics";

interface BuilderCodeOutputProps {
  config: BuilderConfig;
}

export function BuilderCodeOutput({ config }: BuilderCodeOutputProps) {
  const [copied, setCopied] = useState(false);

  const componentCode = generateComponentCode(config);

  const handleCopy = async () => {
    analytics.builder.codeCopied();
    await navigator.clipboard.writeText(componentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between px-3 py-2">
        <span className="font-medium text-sm">thread.tsx</span>
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
          language="tsx"
          theme={{ dark: "vitesse-dark", light: "vitesse-light" }}
          addDefaultStyles={false}
          showLanguage={false}
          defaultColor="light-dark()"
        >
          {componentCode.trim()}
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
    `  AuiIf,`,
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
    components.reasoning &&
      `import { Reasoning, ReasoningGroup } from "@/components/assistant-ui/reasoning";`,
    components.sources &&
      `import { Sources } from "@/components/assistant-ui/sources";`,
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

  const borderRadiusClass = BORDER_RADIUS_CLASS[styles.borderRadius];
  const fontSizeClass = FONT_SIZE_CLASS[styles.fontSize];
  const messageSpacingClass = MESSAGE_SPACING_CLASS[styles.messageSpacing];
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
            ? `<AuiIf condition={(s) => s.thread.isEmpty}>
          <ThreadWelcome />
        </AuiIf>`
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

      <AuiIf condition={(s) => !s.thread.isRunning}>
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
      </AuiIf>

      <AuiIf condition={(s) => s.thread.isRunning}>
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
      </AuiIf>
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

  // Build MessagePrimitive.Parts components object
  const partsComponents: string[] = [];
  if (components.markdown) {
    partsComponents.push(`Text: MarkdownText`);
    partsComponents.push(`tools: { Fallback: ToolFallback }`);
  }
  if (components.reasoning) {
    partsComponents.push(`Reasoning`);
    partsComponents.push(`ReasoningGroup`);
  }
  if (components.sources) {
    partsComponents.push(`Source: Sources`);
  }

  const partsComponentsStr =
    partsComponents.length > 0
      ? `
          components={{
            ${partsComponents.join(",\n            ")},
          }}`
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
      <div className="break-words px-2 leading-relaxed text-foreground">
        <MessagePrimitive.Parts${partsComponentsStr} />
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

      <div className="mt-1 ml-2 flex">
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

  return `import {\n  ${[...new Set(icons)].sort().join(",\n  ")},\n} from "lucide-react";`;
}
