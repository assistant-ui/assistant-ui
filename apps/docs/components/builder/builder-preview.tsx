"use client";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  BotIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  LoaderIcon,
  PaperclipIcon,
  PencilIcon,
  RefreshCwIcon,
  Square,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserIcon,
  Volume2Icon,
} from "lucide-react";

import {
  ActionBarPrimitive,
  AssistantIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
} from "@assistant-ui/react";

import { type FC, createContext, useContext, useMemo, memo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
  type SyntaxHighlighterProps,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import ShikiHighlighter from "react-shiki";

import {
  SHIKI_THEME_MAP,
  type BuilderConfig,
  type CodeHighlightTheme,
  type FontSize,
  type MessageSpacing,
} from "./types";

interface BuilderPreviewContextValue {
  config: BuilderConfig;
  borderRadiusClass: string;
  messageSpacingClass: string;
}

const BuilderPreviewContext = createContext<BuilderPreviewContextValue | null>(
  null,
);

function useBuilderPreviewContext() {
  const context = useContext(BuilderPreviewContext);
  if (!context) {
    throw new Error(
      "useBuilderPreviewContext must be used within BuilderPreviewProvider",
    );
  }
  return context;
}

const UserMessageWrapper: FC = () => {
  const { config, borderRadiusClass, messageSpacingClass } =
    useBuilderPreviewContext();
  return (
    <UserMessage
      config={config}
      borderRadiusClass={borderRadiusClass}
      messageSpacingClass={messageSpacingClass}
    />
  );
};

const AssistantMessageWrapper: FC = () => {
  const { config, borderRadiusClass, messageSpacingClass } =
    useBuilderPreviewContext();
  return (
    <AssistantMessage
      config={config}
      borderRadiusClass={borderRadiusClass}
      messageSpacingClass={messageSpacingClass}
    />
  );
};

const messageComponents = {
  UserMessage: UserMessageWrapper,
  AssistantMessage: AssistantMessageWrapper,
};

const PlainText: FC<{ text: string }> = ({ text }) => {
  return <p className="whitespace-pre-wrap">{text}</p>;
};

interface BuilderPreviewProps {
  config: BuilderConfig;
}

export function BuilderPreview({ config }: BuilderPreviewProps) {
  const { components, styles } = config;

  const borderRadiusClass = {
    none: "rounded-none",
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    full: "rounded-3xl",
  }[styles.borderRadius];

  const fontSizeClass = getFontSizeClass(styles.fontSize);
  const messageSpacingClass = getMessageSpacingClass(styles.messageSpacing);

  const themeClass = styles.theme === "dark" ? "dark" : "";

  return (
    <BuilderPreviewContext.Provider
      value={{ config, borderRadiusClass, messageSpacingClass }}
    >
      <div
        className={cn("h-full w-full", themeClass)}
        style={
          {
            "--accent-color": styles.accentColor,
            "--thread-max-width": styles.maxWidth,
            fontFamily: styles.fontFamily,
          } as React.CSSProperties
        }
      >
        <ThreadPrimitive.Root
          className={cn(
            "flex h-full flex-col bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100",
            fontSizeClass,
          )}
        >
          <ThreadPrimitive.Viewport className="relative flex flex-1 flex-col overflow-y-auto px-4">
            {components.threadWelcome && (
              <ThreadPrimitive.Empty>
                <ThreadWelcome
                  showSuggestions={components.suggestions}
                  borderRadiusClass={borderRadiusClass}
                />
              </ThreadPrimitive.Empty>
            )}

            {!components.threadWelcome && (
              <ThreadPrimitive.Empty>
                <div className="grow" />
              </ThreadPrimitive.Empty>
            )}

            <ThreadPrimitive.Messages components={messageComponents} />

            <AssistantIf condition={({ thread }) => !thread.isEmpty}>
              <div className="min-h-8 grow" />
            </AssistantIf>

            <Composer config={config} borderRadiusClass={borderRadiusClass} />
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </div>
    </BuilderPreviewContext.Provider>
  );
}

function getFontSizeClass(fontSize: FontSize): string {
  return {
    sm: "text-sm",
    base: "text-base",
    lg: "text-lg",
  }[fontSize];
}

function getMessageSpacingClass(spacing: MessageSpacing): string {
  return {
    compact: "py-2",
    comfortable: "py-4",
    spacious: "py-6",
  }[spacing];
}

interface ThreadWelcomeProps {
  showSuggestions: boolean;
  borderRadiusClass: string;
}

const ThreadWelcome: FC<ThreadWelcomeProps> = ({
  showSuggestions,
  borderRadiusClass,
}) => {
  return (
    <div className="mx-auto my-auto flex w-full max-w-[var(--thread-max-width)] flex-grow flex-col">
      <div className="flex w-full flex-grow flex-col items-center justify-center">
        <div className="flex size-full flex-col justify-center px-8">
          <div className="font-semibold text-2xl">Hello there!</div>
          <div className="text-2xl text-muted-foreground/65">
            How can I help you today?
          </div>
        </div>
      </div>
      {showSuggestions && (
        <div className="grid w-full gap-2 pb-4 md:grid-cols-2">
          {[
            { title: "What's the weather", label: "in San Francisco?" },
            { title: "Explain React hooks", label: "like useState" },
          ].map((suggestion) => (
            <ThreadPrimitive.Suggestion
              key={suggestion.title}
              prompt={`${suggestion.title} ${suggestion.label}`}
              send
              asChild
            >
              <Button
                variant="ghost"
                className={cn(
                  "h-auto w-full flex-col items-start justify-start gap-1 border px-5 py-4 text-left text-sm",
                  borderRadiusClass,
                )}
              >
                <span className="font-medium">{suggestion.title}</span>
                <span className="text-muted-foreground">
                  {suggestion.label}
                </span>
              </Button>
            </ThreadPrimitive.Suggestion>
          ))}
        </div>
      )}
    </div>
  );
};

interface ComposerProps {
  config: BuilderConfig;
  borderRadiusClass: string;
}

const Composer: FC<ComposerProps> = ({ config, borderRadiusClass }) => {
  const { components } = config;

  return (
    <div className="sticky bottom-0 mx-auto flex w-full max-w-[var(--thread-max-width)] flex-col gap-4 bg-background pb-4 dark:bg-zinc-900">
      {components.scrollToBottom && <ThreadScrollToBottom />}
      <ComposerPrimitive.Root className="relative flex w-full flex-col">
        <div
          className={cn(
            "flex w-full flex-col border border-input bg-background px-1 pt-2 shadow-sm dark:border-zinc-700 dark:bg-zinc-800",
            borderRadiusClass,
          )}
        >
          <ComposerPrimitive.Input
            placeholder="Send a message..."
            className="mb-1 max-h-32 min-h-16 w-full resize-none bg-transparent px-3.5 pt-1.5 pb-3 text-base outline-none placeholder:text-muted-foreground"
            rows={1}
            autoFocus
          />
          <div className="relative mx-1 mt-2 mb-2 flex items-center justify-between">
            {components.attachments ? (
              <ComposerPrimitive.AddAttachment asChild>
                <TooltipIconButton
                  tooltip="Add attachment"
                  variant="ghost"
                  className="text-muted-foreground"
                >
                  <PaperclipIcon className="size-5" />
                </TooltipIconButton>
              </ComposerPrimitive.AddAttachment>
            ) : (
              <div />
            )}

            <AssistantIf condition={({ thread }) => !thread.isRunning}>
              <ComposerPrimitive.Send asChild>
                <TooltipIconButton
                  tooltip="Send message"
                  variant="default"
                  className={cn(
                    "size-[34px] rounded-full p-1",
                    isLightColor(config.styles.accentColor)
                      ? "text-black"
                      : "text-white",
                  )}
                  style={{ backgroundColor: "var(--accent-color)" }}
                >
                  <ArrowUpIcon className="size-5" />
                </TooltipIconButton>
              </ComposerPrimitive.Send>
            </AssistantIf>

            <AssistantIf condition={({ thread }) => thread.isRunning}>
              <ComposerPrimitive.Cancel asChild>
                <Button
                  variant="default"
                  size="icon"
                  className={cn(
                    "size-[34px] rounded-full",
                    isLightColor(config.styles.accentColor)
                      ? "text-black"
                      : "text-white",
                  )}
                  style={{ backgroundColor: "var(--accent-color)" }}
                >
                  <Square className="size-3.5 fill-current" />
                </Button>
              </ComposerPrimitive.Cancel>
            </AssistantIf>
          </div>
        </div>
      </ComposerPrimitive.Root>
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
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
};

interface UserMessageProps {
  config: BuilderConfig;
  borderRadiusClass: string;
  messageSpacingClass: string;
}

const UserMessage: FC<UserMessageProps> = ({
  config,
  borderRadiusClass,
  messageSpacingClass,
}) => {
  const { components, styles } = config;
  const isLeftAligned = styles.userMessagePosition === "left";

  return (
    <MessagePrimitive.Root
      className={cn(
        "mx-auto flex w-full max-w-[var(--thread-max-width)] gap-3 px-2",
        messageSpacingClass,
        isLeftAligned ? "flex-row" : "flex-row-reverse",
        styles.animations &&
          "fade-in slide-in-from-bottom-2 animate-in duration-300",
      )}
    >
      {components.avatar && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <UserIcon className="size-4" />
        </div>
      )}
      <div
        className={cn(
          "relative min-w-0 max-w-[80%]",
          !isLeftAligned && "ml-auto",
        )}
      >
        <div
          className={cn(
            "break-words bg-muted px-5 py-2.5 text-foreground",
            borderRadiusClass,
          )}
        >
          <MessagePrimitive.Parts />
        </div>
        {components.editMessage && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 pr-2",
              isLeftAligned
                ? "right-0 translate-x-full pr-0 pl-2"
                : "left-0 -translate-x-full",
            )}
          >
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
          </div>
        )}
      </div>

      {components.branchPicker && <BranchPicker className="-mr-1 self-end" />}
    </MessagePrimitive.Root>
  );
};

interface AssistantMessageProps {
  config: BuilderConfig;
  borderRadiusClass: string;
  messageSpacingClass: string;
}

const AssistantMessage: FC<AssistantMessageProps> = ({
  config,
  messageSpacingClass,
}) => {
  const { components, styles } = config;
  const TextComponent = components.markdown
    ? () => (
        <ConfigurableMarkdownText
          codeHighlightTheme={components.codeHighlightTheme}
        />
      )
    : PlainText;

  return (
    <MessagePrimitive.Root
      className={cn(
        "relative mx-auto flex w-full max-w-[var(--thread-max-width)] gap-3",
        messageSpacingClass,
        styles.animations &&
          "fade-in slide-in-from-bottom-2 animate-in duration-300",
      )}
      style={
        components.typingIndicator !== "dot"
          ? ({ "--aui-content": "none" } as React.CSSProperties)
          : undefined
      }
    >
      {components.avatar && (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <BotIcon className="size-4" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        {/* Reasoning/Thinking Section */}
        {components.reasoning && (
          <div className="mb-3 overflow-hidden rounded-lg border border-muted-foreground/30 border-dashed bg-muted/30">
            <details className="group">
              <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-muted-foreground text-sm hover:bg-muted/50">
                <ChevronDownIcon className="size-4 transition-transform group-open:rotate-180" />
                <span className="font-medium">Thinking...</span>
              </summary>
              <div className="border-muted-foreground/30 border-t border-dashed px-3 py-2 text-muted-foreground text-sm italic">
                Let me analyze this step by step. First, I&apos;ll consider the
                key points of your question...
              </div>
            </details>
          </div>
        )}

        <div className="break-words text-foreground leading-7">
          <MessagePrimitive.Parts components={{ Text: TextComponent }} />
        </div>

        {components.loadingIndicator !== "none" && (
          <AssistantIf
            condition={({ thread, message }) =>
              thread.isRunning && message.content.length === 0
            }
          >
            <div className="flex items-center gap-2 text-muted-foreground">
              <LoaderIcon className="size-4 animate-spin" />
              {components.loadingIndicator === "text" && (
                <span className="text-sm">{components.loadingText}</span>
              )}
            </div>
          </AssistantIf>
        )}

        <div className="mt-2 flex">
          {components.branchPicker && <BranchPicker />}
          <AssistantActionBar config={config} />
        </div>

        {components.followUpSuggestions && (
          <AssistantIf condition={({ thread }) => !thread.isRunning}>
            <div className="mt-4 flex flex-wrap gap-2">
              <ThreadPrimitive.Suggestion
                prompt="Tell me more"
                className="rounded-full border bg-background px-3 py-1 text-sm hover:bg-muted dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                Tell me more
              </ThreadPrimitive.Suggestion>
              <ThreadPrimitive.Suggestion
                prompt="Can you explain differently?"
                className="rounded-full border bg-background px-3 py-1 text-sm hover:bg-muted dark:border-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-700"
              >
                Explain differently
              </ThreadPrimitive.Suggestion>
            </div>
          </AssistantIf>
        )}
      </div>
    </MessagePrimitive.Root>
  );
};

interface AssistantActionBarProps {
  config: BuilderConfig;
}

const AssistantActionBar: FC<AssistantActionBarProps> = ({ config }) => {
  const { components } = config;
  const { actionBar } = components;

  if (
    !actionBar.copy &&
    !actionBar.reload &&
    !actionBar.speak &&
    !actionBar.feedback
  ) {
    return null;
  }

  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      autohideFloat="single-branch"
      className="-ml-1 flex gap-1 text-muted-foreground"
    >
      {actionBar.copy && (
        <ActionBarPrimitive.Copy asChild>
          <TooltipIconButton tooltip="Copy">
            <AssistantIf condition={({ message }) => message.isCopied}>
              <CheckIcon />
            </AssistantIf>
            <AssistantIf condition={({ message }) => !message.isCopied}>
              <CopyIcon />
            </AssistantIf>
          </TooltipIconButton>
        </ActionBarPrimitive.Copy>
      )}
      {actionBar.reload && (
        <ActionBarPrimitive.Reload asChild>
          <TooltipIconButton tooltip="Regenerate">
            <RefreshCwIcon />
          </TooltipIconButton>
        </ActionBarPrimitive.Reload>
      )}
      {actionBar.speak && (
        <ActionBarPrimitive.Speak asChild>
          <TooltipIconButton tooltip="Read aloud">
            <Volume2Icon />
          </TooltipIconButton>
        </ActionBarPrimitive.Speak>
      )}
      {actionBar.feedback && (
        <>
          {/* Using regular buttons for preview - actual implementation uses ActionBarPrimitive.FeedbackPositive/Negative */}
          <TooltipIconButton tooltip="Good response">
            <ThumbsUpIcon />
          </TooltipIconButton>
          <TooltipIconButton tooltip="Bad response">
            <ThumbsDownIcon />
          </TooltipIconButton>
        </>
      )}
    </ActionBarPrimitive.Root>
  );
};

interface BranchPickerProps {
  className?: string;
}

const BranchPicker: FC<BranchPickerProps> = ({ className }) => {
  return (
    <BranchPickerPrimitive.Root
      hideWhenSingleBranch
      className={cn(
        "mr-2 -ml-2 inline-flex items-center text-muted-foreground text-xs",
        className,
      )}
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
};

/**
 * Determines if a hex color is light (should use dark text) or dark (should use light text)
 */
function isLightColor(hexColor: string): boolean {
  // Remove # if present
  const hex = hexColor.replace("#", "");

  // Parse RGB values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate relative luminance using sRGB formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  // Return true if light (luminance > 0.5)
  return luminance > 0.5;
}

const MarkdownCodeHeader: FC<CodeHeaderProps> = ({ language }) => (
  <div className="mt-4 flex items-center justify-between gap-4 rounded-t-lg bg-zinc-800 px-4 py-2 font-semibold text-sm text-zinc-300 dark:bg-zinc-700">
    <span className="lowercase">{language}</span>
  </div>
);

const MarkdownH1: FC<React.ComponentProps<"h1">> = ({
  className,
  ...props
}) => (
  <h1
    className={cn(
      "mb-8 scroll-m-20 font-extrabold text-4xl tracking-tight last:mb-0",
      className,
    )}
    {...props}
  />
);

const MarkdownH2: FC<React.ComponentProps<"h2">> = ({
  className,
  ...props
}) => (
  <h2
    className={cn(
      "mt-8 mb-4 scroll-m-20 font-semibold text-3xl tracking-tight first:mt-0 last:mb-0",
      className,
    )}
    {...props}
  />
);

const MarkdownH3: FC<React.ComponentProps<"h3">> = ({
  className,
  ...props
}) => (
  <h3
    className={cn(
      "mt-6 mb-4 scroll-m-20 font-semibold text-2xl tracking-tight first:mt-0 last:mb-0",
      className,
    )}
    {...props}
  />
);

const MarkdownP: FC<React.ComponentProps<"p">> = ({ className, ...props }) => (
  <p
    className={cn("mt-5 mb-5 leading-7 first:mt-0 last:mb-0", className)}
    {...props}
  />
);

const MarkdownUl: FC<React.ComponentProps<"ul">> = ({
  className,
  ...props
}) => (
  <ul className={cn("my-5 ml-6 list-disc [&>li]:mt-2", className)} {...props} />
);

const MarkdownOl: FC<React.ComponentProps<"ol">> = ({
  className,
  ...props
}) => (
  <ol
    className={cn("my-5 ml-6 list-decimal [&>li]:mt-2", className)}
    {...props}
  />
);

const MarkdownPre: FC<React.ComponentProps<"pre">> = ({
  className,
  ...props
}) => (
  <pre
    className={cn(
      "overflow-x-auto rounded-b-lg bg-zinc-900 p-4 text-white dark:bg-zinc-800",
      className,
    )}
    {...props}
  />
);

const MarkdownCode: FC<React.ComponentProps<"code">> = ({
  className,
  ...props
}) => {
  const isCodeBlock = useIsMarkdownCodeBlock();
  return (
    <code
      className={cn(
        !isCodeBlock && "rounded border bg-muted px-1 font-semibold",
        className,
      )}
      {...props}
    />
  );
};

const baseMarkdownComponents = {
  h1: MarkdownH1,
  h2: MarkdownH2,
  h3: MarkdownH3,
  p: MarkdownP,
  ul: MarkdownUl,
  ol: MarkdownOl,
  pre: MarkdownPre,
  code: MarkdownCode,
  CodeHeader: MarkdownCodeHeader,
};

const createSyntaxHighlighter = (
  theme: Exclude<CodeHighlightTheme, "none">,
): FC<SyntaxHighlighterProps> => {
  const SyntaxHighlighter: FC<SyntaxHighlighterProps> = ({
    code,
    language,
  }) => (
    <ShikiHighlighter
      language={language ?? "text"}
      theme={SHIKI_THEME_MAP[theme]}
      addDefaultStyles={false}
      showLanguage={false}
      defaultColor="light-dark()"
      className="[&_pre]:overflow-x-auto [&_pre]:rounded-b-lg [&_pre]:bg-zinc-900 [&_pre]:p-4 dark:[&_pre]:bg-zinc-800"
    >
      {code}
    </ShikiHighlighter>
  );
  return SyntaxHighlighter;
};

interface ConfigurableMarkdownTextProps {
  codeHighlightTheme: CodeHighlightTheme;
}

const ConfigurableMarkdownText: FC<ConfigurableMarkdownTextProps> = memo(
  ({ codeHighlightTheme }) => {
    const components = useMemo(() => {
      if (codeHighlightTheme === "none") {
        return memoizeMarkdownComponents(baseMarkdownComponents);
      }

      return memoizeMarkdownComponents({
        ...baseMarkdownComponents,
        SyntaxHighlighter: createSyntaxHighlighter(codeHighlightTheme),
      });
    }, [codeHighlightTheme]);

    return (
      <MarkdownTextPrimitive
        remarkPlugins={[remarkGfm]}
        components={components}
      />
    );
  },
);

ConfigurableMarkdownText.displayName = "ConfigurableMarkdownText";
