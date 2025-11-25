"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon, TerminalIcon, CodeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { BuilderConfig } from "./types";

interface BuilderCodeOutputProps {
  config: BuilderConfig;
}

export function BuilderCodeOutput({ config }: BuilderCodeOutputProps) {
  const [copiedTab, setCopiedTab] = useState<string | null>(null);

  const componentCode = generateComponentCode(config);
  const cliCommand = generateCliCommand(config);

  const handleCopy = async (text: string, tab: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedTab(tab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <Tabs defaultValue="code" className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <TabsList className="h-8">
          <TabsTrigger value="code" className="gap-1.5 text-xs">
            <CodeIcon className="size-3.5" />
            Code
          </TabsTrigger>
          <TabsTrigger value="cli" className="gap-1.5 text-xs">
            <TerminalIcon className="size-3.5" />
            CLI
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="code" className="mt-0 flex-1 overflow-hidden">
        <div className="relative h-full">
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-2 right-2 z-10 gap-1.5"
            onClick={() => handleCopy(componentCode, "code")}
          >
            {copiedTab === "code" ? (
              <>
                <CheckIcon className="size-3.5" />
                Copied!
              </>
            ) : (
              <>
                <CopyIcon className="size-3.5" />
                Copy
              </>
            )}
          </Button>
          <pre className="h-full overflow-auto bg-muted/50 p-4 font-mono text-xs leading-relaxed">
            <code>{componentCode}</code>
          </pre>
        </div>
      </TabsContent>

      <TabsContent value="cli" className="mt-0 flex-1 overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="relative flex-1">
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 z-10 gap-1.5"
              onClick={() => handleCopy(cliCommand, "cli")}
            >
              {copiedTab === "cli" ? (
                <>
                  <CheckIcon className="size-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5" />
                  Copy
                </>
              )}
            </Button>
            <pre className="h-full overflow-auto bg-muted/50 p-4 font-mono text-xs leading-relaxed">
              <code>{cliCommand}</code>
            </pre>
          </div>
          <div className="border-t bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">
              Run this command to add the configured thread component to your
              project. Make sure you have{" "}
              <code className="rounded bg-muted px-1 py-0.5">
                @assistant-ui/react
              </code>{" "}
              installed.
            </p>
          </div>
        </div>
      </TabsContent>
    </Tabs>
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
    `import { MarkdownText } from "@/components/assistant-ui/markdown-text";`,
  ]
    .filter(Boolean)
    .join("\n");

  const iconImports = generateIconImports(config);

  const borderRadiusClass = getBorderRadiusClass(styles.borderRadius);

  const threadComponent = `
export function Thread() {
  return (
    <ThreadPrimitive.Root
      className="flex h-full flex-col bg-background"
      style={{
        ["--thread-max-width" as string]: "${styles.maxWidth}",
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
                <TooltipIconButton tooltip="Send message" variant="default" className="size-[34px] rounded-full p-1">
                  <ArrowUpIcon className="size-5" />
                </TooltipIconButton>
              </ComposerPrimitive.Send>
            </ThreadPrimitive.If>

            <ThreadPrimitive.If running>
              <ComposerPrimitive.Cancel asChild>
                <Button variant="default" size="icon" className="size-[34px] rounded-full">
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

  const userMessageComponent = `
function UserMessage() {
  return (
    <MessagePrimitive.Root className="mx-auto grid w-full max-w-[var(--thread-max-width)] auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] gap-y-2 px-2 py-4 [&:where(>*)]:col-start-2">
      <div className="relative col-start-2 min-w-0">
        <div className="${borderRadiusClass} bg-muted px-5 py-2.5 break-words text-foreground">
          <MessagePrimitive.Parts />
        </div>
        ${
          components.editMessage
            ? `<div className="absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2">
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
      ${
        components.branchPicker
          ? `<BranchPicker className="col-span-full col-start-1 row-start-3 -mr-1 justify-end" />`
          : ""
      }
    </MessagePrimitive.Root>
  );
}`;

  const assistantMessageComponent = `
function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="relative mx-auto w-full max-w-[var(--thread-max-width)] py-4">
      <div className="mx-2 leading-7 break-words text-foreground">
        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      </div>

      <div className="mt-2 ml-2 flex">
        ${components.branchPicker ? "<BranchPicker />" : ""}
        <AssistantActionBar />
      </div>
    </MessagePrimitive.Root>
  );
}`;

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
      }
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

function generateCliCommand(_config: BuilderConfig): string {
  return `# Step 1: Initialize assistant-ui in your project
npx assistant-ui@latest init

# Step 2: Add the thread component
npx assistant-ui@latest add thread

# Step 3: Copy the generated code above and paste it into your thread.tsx file
# The code above is customized based on your playground configuration

# Additional components you might need:
npx assistant-ui@latest add markdown-text
npx assistant-ui@latest add tooltip-icon-button
npx assistant-ui@latest add attachment

# Or add all components at once:
npx assistant-ui@latest add thread markdown-text tooltip-icon-button attachment`;
}
