"use client";

import { useState, useMemo } from "react";
import { highlight } from "sugar-high";
import { CheckIcon, CopyIcon, TerminalIcon, CodeIcon } from "lucide-react";

import type { BuilderConfig } from "./types";
import { cn } from "@/lib/utils";

interface BuilderCodeOutputProps {
  config: BuilderConfig;
}

export function BuilderCodeOutput({ config }: BuilderCodeOutputProps) {
  const [activeTab, setActiveTab] = useState<"code" | "cli">("code");
  const [copied, setCopied] = useState(false);

  const componentCode = generateComponentCode(config);
  const cliCommand = generateCliCommand(config);

  const highlightedCode = useMemo(
    () => highlight(componentCode),
    [componentCode],
  );
  const highlightedCli = useMemo(() => highlight(cliCommand), [cliCommand]);

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

      <div className="min-h-0 flex-1 overflow-auto">
        <pre className="p-4 font-mono text-xs leading-relaxed">
          <code
            dangerouslySetInnerHTML={{
              __html: activeTab === "code" ? highlightedCode : highlightedCli,
            }}
          />
        </pre>
      </div>
    </div>
  );
}

function generateComponentCode(config: BuilderConfig): string {
  const { components, styles } = config;

  const imports = [
    `import {`,
    `  ActionBarPrimitive,`,
    components.branchPicker && `  BranchPickerPrimitive,`,
    `  ComposerPrimitive,`,
    `  MessagePrimitive,`,
    `  ThreadPrimitive,`,
    `} from "@assistant-ui/react";`,
    ``,
    `import { Button } from "@/components/ui/button";`,
    `import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";`,
    components.markdown &&
      `import { MarkdownText } from "@/components/assistant-ui/markdown-text";`,
  ]
    .filter(Boolean)
    .join("\n");

  const iconImports = generateIconImports(config);

  const borderRadiusClass = getBorderRadiusClass(styles.borderRadius);
  const fontSizeClass = getFontSizeClass(styles.fontSize);
  const messageSpacingClass = getMessageSpacingClass(styles.messageSpacing);

  // Generate CSS variables section
  const cssVariables = `
    "--thread-max-width": "${styles.maxWidth}",
    "--accent-color": "${styles.accentColor}",`;

  // Generate font family inline style
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
      <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-auto px-4">
        ${
          components.threadWelcome
            ? `<ThreadPrimitive.Empty>
          <ThreadWelcome />
        </ThreadPrimitive.Empty>`
            : ""
        }

        <ThreadPrimitive.Messages
          components={{
            UserMessage,
            AssistantMessage,
          }}
        />

        <ThreadPrimitive.If empty={false}>
          <div className="min-h-8 grow" />
        </ThreadPrimitive.If>

        <Composer />
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
    <div className="sticky bottom-0 mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 bg-background pb-4">
      ${components.scrollToBottom ? "<ThreadScrollToBottom />" : ""}
      <ComposerPrimitive.Root className="relative flex w-full flex-col">
        <div className="flex w-full flex-col ${borderRadiusClass} border border-input bg-background px-1 pt-2 shadow-sm">
          <ComposerPrimitive.Input
            placeholder="Send a message..."
            className="mb-1 max-h-32 min-h-16 w-full resize-none bg-transparent px-3.5 pt-1.5 pb-3 text-base outline-none placeholder:text-muted-foreground"
            rows={1}
            autoFocus
          />
          <div className="relative mx-1 mt-2 mb-2 flex items-center justify-between">
            ${
              components.attachments
                ? `<ComposerPrimitive.AddAttachment asChild>
              <TooltipIconButton tooltip="Add attachment" variant="ghost" className="text-muted-foreground">
                <PaperclipIcon className="size-5" />
              </TooltipIconButton>
            </ComposerPrimitive.AddAttachment>`
                : "<div />"
            }

            <ThreadPrimitive.If running={false}>
              <ComposerPrimitive.Send asChild>
                <TooltipIconButton
                  tooltip="Send message"
                  variant="default"
                  className="size-[34px] rounded-full p-1"
                  style={{ backgroundColor: "var(--accent-color)" }}
                >
                  <ArrowUpIcon className="size-5 text-white" />
                </TooltipIconButton>
              </ComposerPrimitive.Send>
            </ThreadPrimitive.If>

            <ThreadPrimitive.If running>
              <ComposerPrimitive.Cancel asChild>
                <Button
                  variant="default"
                  size="icon"
                  className="size-[34px] rounded-full"
                  style={{ backgroundColor: "var(--accent-color)" }}
                >
                  <Square className="size-3.5 fill-current" />
                </Button>
              </ComposerPrimitive.Cancel>
            </ThreadPrimitive.If>
          </div>
        </div>
      </ComposerPrimitive.Root>
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

  const isLeftAligned = styles.userMessagePosition === "left";
  const animationClass = styles.animations
    ? " animate-in fade-in slide-in-from-bottom-2 duration-300"
    : "";

  const userMessageRootClass = `mx-auto flex w-full max-w-[var(--thread-max-width)] gap-3 px-2 ${messageSpacingClass} ${isLeftAligned ? "flex-row" : "flex-row-reverse"}${animationClass}`;
  const userMessageContentClass = `relative min-w-0 max-w-[80%]${!isLeftAligned ? " ml-auto" : ""}`;
  const editButtonPositionClass = isLeftAligned
    ? "absolute top-1/2 -translate-y-1/2 right-0 translate-x-full pl-2"
    : "absolute top-1/2 -translate-y-1/2 left-0 -translate-x-full pr-2";

  const userMessageComponent = `
function UserMessage() {
  return (
    <MessagePrimitive.Root className="${userMessageRootClass}">
      ${
        components.avatar
          ? `<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
        <UserIcon className="size-4" />
      </div>`
          : ""
      }
      <div className="${userMessageContentClass}">
        <div className="${borderRadiusClass} bg-muted px-5 py-2.5 break-words text-foreground">
          <MessagePrimitive.Parts />
        </div>
        ${
          components.editMessage
            ? `<div className="${editButtonPositionClass}">
          <ActionBarPrimitive.Root hideWhenRunning autohide="not-last" className="flex flex-col items-end">
            <ActionBarPrimitive.Edit asChild>
              <TooltipIconButton tooltip="Edit" className="p-4">
                <PencilIcon />
              </TooltipIconButton>
            </ActionBarPrimitive.Edit>
          </ActionBarPrimitive.Root>
        </div>`
            : ""
        }
      </div>
      ${components.branchPicker ? `<BranchPicker className="-mr-1 self-end" />` : ""}
    </MessagePrimitive.Root>
  );
}`;

  const assistantMessageRootClass = `relative mx-auto flex w-full max-w-[var(--thread-max-width)] gap-3 ${messageSpacingClass}${animationClass}`;
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
    <MessagePrimitive.Root className="${assistantMessageRootClass}">
      ${
        components.avatar
          ? `<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <BotIcon className="size-4" />
      </div>`
          : ""
      }
      <div className="min-w-0 flex-1">${reasoningSection}
        <div className="leading-7 break-words text-foreground">
          <MessagePrimitive.Parts${components.markdown ? ` components={{ Text: ${textComponent} }}` : ""} />
        </div>
        ${
          components.typingIndicator
            ? `
        <ThreadPrimitive.If running>
          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
            <LoaderIcon className="size-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        </ThreadPrimitive.If>`
            : ""
        }

        <div className="mt-2 flex">
          ${components.branchPicker ? "<BranchPicker />" : ""}
          <AssistantActionBar />
        </div>
        ${
          components.followUpSuggestions
            ? `
        <ThreadPrimitive.If running={false}>
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
        </ThreadPrimitive.If>`
            : ""
        }
      </div>
    </MessagePrimitive.Root>
  );
}`;

  // Generate action bar with feedback buttons
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
      className="-ml-1 flex gap-1 text-muted-foreground"
    >
      ${
        components.actionBar.copy
          ? `<ActionBarPrimitive.Copy asChild>
        <TooltipIconButton tooltip="Copy">
          <MessagePrimitive.If copied>
            <CheckIcon />
          </MessagePrimitive.If>
          <MessagePrimitive.If copied={false}>
            <CopyIcon />
          </MessagePrimitive.If>
        </TooltipIconButton>
      </ActionBarPrimitive.Copy>`
          : ""
      }
      ${
        components.actionBar.reload
          ? `<ActionBarPrimitive.Reload asChild>
        <TooltipIconButton tooltip="Regenerate">
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
function BranchPicker({ className }: { className?: string }) {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn("mr-2 -ml-2 inline-flex items-center text-xs text-muted-foreground", className)}
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

  return [
    `"use client";`,
    ``,
    iconImports,
    ``,
    imports,
    `import { cn } from "@/lib/utils";`,
    threadComponent,
    welcomeComponent,
    composerComponent,
    scrollToBottomComponent,
    userMessageComponent,
    assistantMessageComponent,
    actionBarComponent,
    branchPickerComponent,
  ]
    .filter(Boolean)
    .join("\n");
}

function generateIconImports(config: BuilderConfig): string {
  const { components } = config;
  const icons: string[] = ["ArrowUpIcon", "Square"];

  if (components.scrollToBottom) icons.push("ArrowDownIcon");
  if (components.attachments) icons.push("PaperclipIcon");
  if (components.editMessage) icons.push("PencilIcon");
  if (components.branchPicker)
    icons.push("ChevronLeftIcon", "ChevronRightIcon");
  if (components.actionBar.copy) icons.push("CheckIcon", "CopyIcon");
  if (components.actionBar.reload) icons.push("RefreshCwIcon");
  if (components.actionBar.speak) icons.push("Volume2Icon");
  if (components.actionBar.feedback)
    icons.push("ThumbsUpIcon", "ThumbsDownIcon");
  if (components.avatar) icons.push("BotIcon", "UserIcon");
  if (components.typingIndicator) icons.push("LoaderIcon");
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

function generateCliCommand(config: BuilderConfig): string {
  const { components } = config;

  // Determine which components to add based on configuration
  const componentsToAdd: string[] = ["thread"];

  if (components.markdown) {
    componentsToAdd.push("markdown-text");
  }

  // tooltip-icon-button is always needed for various actions
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

  return `# Step 1: Initialize assistant-ui in your project
npx assistant-ui@latest init

# Step 2: Add the required components
${addCommand}

# Step 3: Copy the generated code above and paste it into your thread.tsx file
# The code is customized based on your playground configuration

${featureNotes.length > 0 ? `${featureNotes.join("\n")}\n` : ""}
# Configuration Summary:
# - Theme: ${config.styles.theme}
# - Accent Color: ${config.styles.accentColor}
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
# - Typing Indicator: ${components.typingIndicator ? "yes" : "no"}
# - Action Bar Copy: ${components.actionBar.copy ? "yes" : "no"}
# - Action Bar Reload: ${components.actionBar.reload ? "yes" : "no"}
# - Action Bar Speak: ${components.actionBar.speak ? "yes" : "no"}
# - Action Bar Feedback: ${components.actionBar.feedback ? "yes" : "no"}`;
}
