"use client";

import "@assistant-ui/react-markdown/styles/dot.css";

import {
  ArrowDownIcon,
  ArrowUpIcon,
  BotIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  LoaderIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SquareIcon,
  ThumbsDownIcon,
  ThumbsUpIcon,
  UserIcon,
  Volume2Icon,
} from "lucide-react";

import {
  ActionBarPrimitive,
  AuiIf,
  BranchPickerPrimitive,
  ComposerPrimitive,
  MessagePrimitive,
  ThreadPrimitive,
  useAuiState,
  useMessagePartText,
} from "@assistant-ui/react";

import { type FC, createContext, useContext, useMemo, memo } from "react";
import { useHydrated } from "@/hooks/use-hydrated";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import {
  ComposerAttachments,
  UserMessageAttachments,
} from "@/components/assistant-ui/elements/attachment.aui";
import {
  ReasoningRoot,
  ReasoningTrigger,
  ReasoningContent,
  ReasoningText,
} from "@/components/assistant-ui/elements/reasoning.aui";
import {
  Source,
  SourceIcon,
  SourceTitle,
} from "@/components/assistant-ui/elements/sources.aui";
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
  DEFAULT_COLORS,
  type BuilderConfig,
  type CodeHighlightTheme,
  type ThemeColor,
} from "./types";
import {
  COMPOSER_RADIUS,
  MESSAGE_GAP_CLASS,
  isLightColor,
} from "@/lib/builder-utils";

interface BuilderPreviewContextValue {
  config: BuilderConfig;
  isDark: boolean;
  accentColor: string;
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
  const { config } = useBuilderPreviewContext();
  return <UserMessage config={config} />;
};

const AssistantMessageWrapper: FC = () => {
  const { config } = useBuilderPreviewContext();
  return <AssistantMessage config={config} />;
};

const PlainText: FC = () => {
  const { text } = useMessagePartText();
  return <p className="whitespace-pre-wrap">{text}</p>;
};

const MarkdownTextWrapper: FC = () => {
  const { config } = useBuilderPreviewContext();
  return (
    <ConfigurableMarkdownText
      codeHighlightTheme={config.components.codeHighlightTheme}
    />
  );
};

interface BuilderPreviewProps {
  config: BuilderConfig;
}

// Hook to detect page theme from document.documentElement.classList
function usePageTheme() {
  const { resolvedTheme } = useTheme();
  const mounted = useHydrated();

  // Return false during SSR/hydration to avoid mismatch, then update on client
  if (!mounted) return false;
  return resolvedTheme === "dark";
}

export function BuilderPreview({ config }: BuilderPreviewProps) {
  const { components, styles } = config;
  const isEmpty = useAuiState((s) => s.thread.isEmpty);
  const isDark = usePageTheme();

  // Helper to get color value based on current theme
  const getColor = (
    color: ThemeColor | undefined,
    fallback: ThemeColor,
  ): string => {
    const c = color ?? fallback;
    return isDark ? c.dark : c.light;
  };

  const { colors } = styles;
  const accentColor = getColor(colors.accent, DEFAULT_COLORS.accent);

  // Define CSS variables with theme-aware values
  const cssVars = {
    "--aui-thread-max-width": styles.maxWidth,
    "--composer-radius": COMPOSER_RADIUS[styles.borderRadius],
    "--composer-padding": "8px",
    "--composer-bg": getColor(colors.composer, DEFAULT_COLORS.composer),
    "--aui-accent-color": accentColor,
    "--aui-background": getColor(colors.background, DEFAULT_COLORS.background),
    "--aui-foreground": getColor(colors.foreground, DEFAULT_COLORS.foreground),
    "--aui-muted": getColor(colors.muted, DEFAULT_COLORS.muted),
    "--aui-muted-foreground": getColor(
      colors.mutedForeground,
      DEFAULT_COLORS.mutedForeground,
    ),
    "--aui-border": getColor(colors.border, DEFAULT_COLORS.border),
    "--aui-user-message-background": getColor(
      colors.userMessage,
      DEFAULT_COLORS.userMessage,
    ),
    "--aui-assistant-message-background": colors.assistantMessage
      ? getColor(colors.assistantMessage, DEFAULT_COLORS.background)
      : undefined,
    "--aui-composer-background": getColor(
      colors.composer,
      DEFAULT_COLORS.composer,
    ),
    "--aui-user-avatar-background": getColor(
      colors.userAvatar,
      DEFAULT_COLORS.userAvatar,
    ),
    "--aui-assistant-avatar-background": getColor(
      colors.assistantAvatar,
      DEFAULT_COLORS.assistantAvatar,
    ),
    "--aui-suggestion-background": getColor(
      colors.suggestion,
      DEFAULT_COLORS.suggestion,
    ),
    "--aui-suggestion-border": getColor(
      colors.suggestionBorder,
      DEFAULT_COLORS.suggestionBorder,
    ),
    fontFamily: styles.fontFamily,
  } as React.CSSProperties;

  return (
    <BuilderPreviewContext.Provider value={{ config, isDark, accentColor }}>
      <div
        className={cn("h-full w-full", isDark ? "dark" : "light")}
        style={cssVars}
      >
        {config.customCSS && (
          <style>{`@scope (.aui-root) { ${config.customCSS} }`}</style>
        )}
        <ThreadPrimitive.Root
          className="aui-root aui-thread-root @container flex h-full flex-col"
          style={{
            backgroundColor: "var(--aui-background)",
            color: "var(--aui-foreground)",
            fontSize: styles.fontSize,
          }}
        >
          <ThreadPrimitive.Viewport
            turnAnchor="top"
            data-slot="aui_thread-viewport"
            className="aui-thread-viewport relative flex flex-1 flex-col overflow-x-auto overflow-y-scroll scroll-smooth"
          >
            <div
              className={cn(
                "mx-auto flex w-full max-w-(--aui-thread-max-width) flex-1 flex-col px-4 pt-4",
                isEmpty && "justify-center",
              )}
            >
              {components.threadWelcome && (
                <AuiIf condition={(s) => s.thread.isEmpty}>
                  <ThreadWelcome config={config} />
                </AuiIf>
              )}

              <div
                data-slot="aui_message-group"
                className={cn(
                  "mb-14 flex flex-col empty:hidden",
                  MESSAGE_GAP_CLASS[styles.messageSpacing],
                )}
              >
                <ThreadPrimitive.Messages>
                  {({ message }) => {
                    if (message.composer.isEditing) return <EditComposer />;
                    if (message.role === "user") return <UserMessageWrapper />;
                    return <AssistantMessageWrapper />;
                  }}
                </ThreadPrimitive.Messages>
              </div>

              <ThreadPrimitive.ViewportFooter
                className={cn(
                  "aui-thread-viewport-footer flex flex-col gap-4 overflow-visible pb-4 md:pb-6",
                  !isEmpty &&
                    "sticky bottom-0 mt-auto rounded-t-(--composer-radius)",
                )}
                style={{ backgroundColor: "var(--aui-background)" }}
              >
                {components.scrollToBottom && <ThreadScrollToBottom />}
                <Composer config={config} />
                {components.suggestions && (
                  <AuiIf
                    condition={(s) => s.thread.isEmpty && s.composer.isEmpty}
                  >
                    <ThreadSuggestions config={config} />
                  </AuiIf>
                )}
              </ThreadPrimitive.ViewportFooter>
            </div>
          </ThreadPrimitive.Viewport>
        </ThreadPrimitive.Root>
      </div>
    </BuilderPreviewContext.Provider>
  );
}

interface ThreadWelcomeProps {
  config: BuilderConfig;
}

const ThreadWelcome: FC<ThreadWelcomeProps> = ({ config }) => {
  const { styles } = config;

  return (
    <div className="aui-thread-welcome-root mb-6 flex flex-col items-center px-4 text-center">
      <h1
        className={cn(
          "aui-thread-welcome-message-inner text-2xl font-medium tracking-tight",
          styles.animations &&
            "fade-in slide-in-from-bottom-1 animate-in fill-mode-both duration-200",
        )}
      >
        How can I help you today?
      </h1>
    </div>
  );
};

const SUGGESTIONS = [
  {
    title: "What's the weather",
    label: "in San Francisco?",
    prompt: "What's the weather in San Francisco?",
  },
  {
    title: "Explain React hooks",
    label: "like useState and useEffect",
    prompt: "Explain React hooks like useState and useEffect",
  },
] as const;

interface ThreadSuggestionsProps {
  config: BuilderConfig;
}

const ThreadSuggestions: FC<ThreadSuggestionsProps> = ({ config }) => {
  const { styles } = config;

  return (
    <div className="aui-thread-welcome-suggestions flex w-full flex-wrap items-center justify-center gap-2 px-4">
      {SUGGESTIONS.map((suggestion, index) => (
        <div
          key={suggestion.prompt}
          className={cn(
            "aui-thread-welcome-suggestion-display",
            styles.animations &&
              "fade-in slide-in-from-bottom-2 animate-in fill-mode-both duration-200",
          )}
          style={
            styles.animations
              ? { animationDelay: `${100 + index * 50}ms` }
              : undefined
          }
        >
          <ThreadPrimitive.Suggestion prompt={suggestion.prompt} send asChild>
            <Button
              variant="ghost"
              className="aui-thread-welcome-suggestion h-auto gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-normal whitespace-nowrap transition-colors"
              style={{
                backgroundColor: "var(--aui-suggestion-background)",
                borderColor: "var(--aui-suggestion-border)",
              }}
              aria-label={suggestion.prompt}
            >
              <span className="aui-thread-welcome-suggestion-text-1">
                {suggestion.title}
              </span>
              <span
                className="aui-thread-welcome-suggestion-text-2"
                style={{ color: "var(--aui-muted-foreground)" }}
              >
                {suggestion.label}
              </span>
            </Button>
          </ThreadPrimitive.Suggestion>
        </div>
      ))}
    </div>
  );
};

interface ComposerProps {
  config: BuilderConfig;
}

const Composer: FC<ComposerProps> = ({ config }) => {
  return (
    <ComposerPrimitive.Root className="aui-composer-root relative flex w-full flex-col">
      <ComposerPrimitive.AttachmentDropzone asChild>
        <div
          data-slot="aui_composer-shell"
          className="flex w-full cursor-text flex-col gap-2 rounded-(--composer-radius) border p-(--composer-padding) transition-[border-color] data-[dragging=true]:border-dashed"
          style={{
            backgroundColor: "var(--composer-bg)",
            borderColor:
              "color-mix(in oklab, var(--aui-border) 60%, transparent)",
          }}
        >
          {config.components.attachments && <ComposerAttachments />}
          <ComposerPrimitive.Input
            placeholder="Send a message..."
            className="aui-composer-input max-h-48 min-h-10 w-full resize-none bg-transparent px-2.5 py-1 text-base leading-6 outline-none placeholder:text-(--aui-muted-foreground)"
            rows={1}
            autoFocus
            enterKeyHint="send"
            aria-label="Message input"
          />
          <ComposerAction config={config} />
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
};

interface ComposerActionProps {
  config: BuilderConfig;
}

const ComposerAction: FC<ComposerActionProps> = ({ config }) => {
  const { accentColor } = useBuilderPreviewContext();
  const { components } = config;

  return (
    <div className="aui-composer-action-wrapper relative flex items-center justify-between">
      {components.attachments ? (
        <ComposerPrimitive.AddAttachment asChild>
          <TooltipIconButton
            tooltip="Add attachment"
            variant="ghost"
            size="icon"
            className="size-7 rounded-full"
            style={{ color: "var(--aui-muted-foreground)" }}
          >
            <PlusIcon className="size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.AddAttachment>
      ) : (
        <div />
      )}

      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send asChild>
          <TooltipIconButton
            tooltip="Send message"
            side="bottom"
            variant="default"
            size="icon"
            className={cn(
              "aui-composer-send size-7 rounded-full",
              isLightColor(accentColor) ? "text-black" : "text-white",
            )}
            style={{ backgroundColor: "var(--aui-accent-color)" }}
            aria-label="Send message"
          >
            <ArrowUpIcon className="aui-composer-send-icon size-4" />
          </TooltipIconButton>
        </ComposerPrimitive.Send>
      </AuiIf>

      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel asChild>
          <Button
            type="button"
            variant="default"
            size="icon"
            className={cn(
              "aui-composer-cancel size-7 rounded-full",
              isLightColor(accentColor) ? "text-black" : "text-white",
            )}
            style={{ backgroundColor: "var(--aui-accent-color)" }}
            aria-label="Stop generating"
          >
            <SquareIcon className="aui-composer-cancel-icon size-3.5 fill-current" />
          </Button>
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </div>
  );
};

const ThreadScrollToBottom: FC = () => {
  return (
    <ThreadPrimitive.ScrollToBottom asChild>
      <TooltipIconButton
        tooltip="Scroll to bottom"
        variant="outline"
        className="aui-thread-scroll-to-bottom absolute -top-12 z-10 self-center rounded-full p-4 disabled:invisible dark:border-(--aui-border) dark:bg-(--aui-background)"
        style={{
          backgroundColor: "var(--aui-background)",
          borderColor: "var(--aui-border)",
        }}
      >
        <ArrowDownIcon />
      </TooltipIconButton>
    </ThreadPrimitive.ScrollToBottom>
  );
};

interface UserMessageProps {
  config: BuilderConfig;
}

const UserMessage: FC<UserMessageProps> = ({ config }) => {
  const { components, styles } = config;
  const isLeftAligned = styles.userMessagePosition === "left";

  if (isLeftAligned) {
    return (
      <MessagePrimitive.Root
        className={cn(
          "aui-user-message-root mx-auto flex w-full max-w-(--aui-thread-max-width) gap-3 px-2",
          styles.animations &&
            "fade-in slide-in-from-bottom-1 animate-in duration-150",
        )}
        data-role="user"
      >
        {components.avatar && (
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--aui-user-avatar-background)" }}
          >
            <UserIcon className="size-4" />
          </div>
        )}
        {components.attachments && <UserMessageAttachments />}
        <div className="relative max-w-[80%] min-w-0">
          <div
            className="aui-user-message-content peer rounded-xl px-4 py-2 wrap-break-word empty:hidden"
            style={{ backgroundColor: "var(--aui-user-message-background)" }}
          >
            <MessagePrimitive.Parts />
          </div>
          {components.editMessage && (
            <div className="aui-user-action-bar-wrapper absolute top-1/2 right-0 translate-x-full -translate-y-1/2 pl-2 peer-empty:hidden">
              <UserActionBar />
            </div>
          )}
        </div>
        {components.branchPicker && (
          <BranchPicker className="aui-user-branch-picker -mr-1 self-end" />
        )}
      </MessagePrimitive.Root>
    );
  }

  // Right-aligned (default) - use grid layout like thread.tsx
  return (
    <MessagePrimitive.Root
      className={cn(
        "aui-user-message-root mx-auto grid w-full max-w-(--aui-thread-max-width) auto-rows-auto grid-cols-[minmax(72px,1fr)_auto] content-start gap-y-2 px-2",
        "[&:where(>*)]:col-start-2",
        styles.animations &&
          "fade-in slide-in-from-bottom-1 animate-in duration-150",
      )}
      data-role="user"
    >
      {components.avatar && (
        <div className="col-start-2 flex justify-end">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: "var(--aui-user-avatar-background)" }}
          >
            <UserIcon className="size-4" />
          </div>
        </div>
      )}

      {components.attachments && <UserMessageAttachments />}

      <div className="aui-user-message-content-wrapper relative col-start-2 min-w-0">
        <div
          className="aui-user-message-content peer rounded-xl px-4 py-2 wrap-break-word empty:hidden"
          style={{ backgroundColor: "var(--aui-user-message-background)" }}
        >
          <MessagePrimitive.Parts />
        </div>
        {components.editMessage && (
          <div className="aui-user-action-bar-wrapper absolute top-1/2 left-0 -translate-x-full -translate-y-1/2 pr-2 peer-empty:hidden">
            <UserActionBar />
          </div>
        )}
      </div>

      {components.branchPicker && (
        <BranchPicker className="aui-user-branch-picker col-span-full col-start-1 row-start-3 -mr-1 justify-end" />
      )}
    </MessagePrimitive.Root>
  );
};

const UserActionBar: FC = () => {
  return (
    <ActionBarPrimitive.Root
      hideWhenRunning
      autohide="not-last"
      className="aui-user-action-bar-root flex flex-col items-end"
    >
      <ActionBarPrimitive.Edit asChild>
        <TooltipIconButton tooltip="Edit" className="aui-user-action-edit p-4">
          <PencilIcon />
        </TooltipIconButton>
      </ActionBarPrimitive.Edit>
    </ActionBarPrimitive.Root>
  );
};

interface AssistantMessageProps {
  config: BuilderConfig;
}

const AssistantMessage: FC<AssistantMessageProps> = ({ config }) => {
  const { components, styles } = config;

  const TextComponent = components.markdown ? MarkdownTextWrapper : PlainText;

  return (
    <MessagePrimitive.Root
      className={cn(
        "aui-assistant-message-root relative mx-auto w-full max-w-(--aui-thread-max-width) px-2",
        styles.animations &&
          "fade-in slide-in-from-bottom-1 animate-in duration-150",
      )}
      data-role="assistant"
      style={
        components.typingIndicator !== "dot"
          ? ({ "--aui-content": "none" } as React.CSSProperties)
          : undefined
      }
    >
      <div className="flex gap-3">
        {components.avatar && (
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: "var(--aui-assistant-avatar-background)",
            }}
          >
            <BotIcon className="size-4" />
          </div>
        )}
        <div className="min-w-0 flex-1 space-y-2">
          {components.reasoning && (
            <ReasoningRoot variant="muted" className="mb-0">
              <ReasoningTrigger />
              <ReasoningContent>
                <ReasoningText>
                  <p>
                    Let me analyze this step by step. First, I&apos;ll consider
                    the key points of your question...
                  </p>
                </ReasoningText>
              </ReasoningContent>
            </ReasoningRoot>
          )}

          <div
            className={cn(
              "aui-assistant-message-content leading-relaxed wrap-break-word",
              styles.colors.assistantMessage && "rounded-2xl px-4 py-3",
            )}
            style={
              styles.colors.assistantMessage
                ? { backgroundColor: "var(--aui-assistant-message-background)" }
                : undefined
            }
          >
            <MessagePrimitive.Parts>
              {({ part }) => {
                if (part.type === "text") return <TextComponent />;
                return null;
              }}
            </MessagePrimitive.Parts>

            {components.loadingIndicator !== "none" && (
              <AuiIf
                condition={({ thread, message }) =>
                  thread.isRunning && message.content.length === 0
                }
              >
                <div
                  className="flex items-center gap-2"
                  style={{ color: "var(--aui-muted-foreground)" }}
                >
                  <LoaderIcon className="size-4 animate-spin" />
                  {components.loadingIndicator === "text" && (
                    <span className="text-sm">{components.loadingText}</span>
                  )}
                </div>
              </AuiIf>
            )}
          </div>

          {components.sources && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <Source href="https://react.dev">
                <SourceIcon url="https://react.dev" />
                <SourceTitle>React Documentation</SourceTitle>
              </Source>
              <Source href="https://nextjs.org">
                <SourceIcon url="https://nextjs.org" />
                <SourceTitle>Next.js</SourceTitle>
              </Source>
            </div>
          )}

          <div className="aui-assistant-message-footer flex min-h-6 items-center">
            {components.branchPicker && <BranchPicker />}
            <AssistantActionBar config={config} />
          </div>

          {components.followUpSuggestions && (
            <AuiIf condition={(s) => !s.thread.isRunning}>
              <FollowUpSuggestions />
            </AuiIf>
          )}
        </div>
      </div>
    </MessagePrimitive.Root>
  );
};

const FollowUpSuggestions: FC = () => {
  return (
    <div className="flex flex-wrap gap-2">
      <ThreadPrimitive.Suggestion
        prompt="Tell me more"
        className="rounded-full px-3 py-1 text-sm"
        style={{
          backgroundColor: "var(--aui-suggestion-background)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "var(--aui-suggestion-border)",
        }}
      >
        Tell me more
      </ThreadPrimitive.Suggestion>
      <ThreadPrimitive.Suggestion
        prompt="Can you explain differently?"
        className="rounded-full px-3 py-1 text-sm"
        style={{
          backgroundColor: "var(--aui-suggestion-background)",
          borderWidth: "1px",
          borderStyle: "solid",
          borderColor: "var(--aui-suggestion-border)",
        }}
      >
        Explain differently
      </ThreadPrimitive.Suggestion>
    </div>
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
      className="aui-assistant-action-bar-root -ml-1 flex gap-1"
      style={{ color: "var(--aui-muted-foreground)" }}
    >
      {actionBar.copy && (
        <ActionBarPrimitive.Copy asChild>
          <TooltipIconButton tooltip="Copy">
            <AuiIf condition={(s) => s.message.isCopied}>
              <CheckIcon />
            </AuiIf>
            <AuiIf condition={(s) => !s.message.isCopied}>
              <CopyIcon />
            </AuiIf>
          </TooltipIconButton>
        </ActionBarPrimitive.Copy>
      )}
      {actionBar.reload && (
        <ActionBarPrimitive.Reload asChild>
          <TooltipIconButton tooltip="Refresh">
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
        "aui-branch-picker-root mr-2 -ml-2 inline-flex items-center text-xs",
        className,
      )}
      style={{ color: "var(--aui-muted-foreground)" }}
    >
      <BranchPickerPrimitive.Previous asChild>
        <TooltipIconButton tooltip="Previous">
          <ChevronLeftIcon />
        </TooltipIconButton>
      </BranchPickerPrimitive.Previous>
      <span className="aui-branch-picker-state font-medium">
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

const EditComposer: FC = () => {
  return (
    <MessagePrimitive.Root className="aui-edit-composer-wrapper mx-auto flex w-full max-w-(--aui-thread-max-width) flex-col px-2">
      <ComposerPrimitive.Root
        className="aui-edit-composer-root ms-auto flex w-full max-w-[85%] cursor-text flex-col rounded-(--composer-radius) border bg-(--composer-bg)"
        style={{ borderColor: "var(--aui-border)" }}
      >
        <ComposerPrimitive.Input
          className="aui-edit-composer-input min-h-14 w-full resize-none bg-transparent px-4 pt-3 pb-1 text-base outline-none"
          style={{ color: "var(--aui-foreground)" }}
          autoFocus
        />
        <div className="aui-edit-composer-footer mx-2.5 mb-2.5 flex items-center gap-1.5 self-end">
          <ComposerPrimitive.Cancel asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 rounded-full px-3.5"
            >
              Cancel
            </Button>
          </ComposerPrimitive.Cancel>
          <ComposerPrimitive.Send asChild>
            <Button size="sm" className="h-8 rounded-full px-3.5">
              Update
            </Button>
          </ComposerPrimitive.Send>
        </div>
      </ComposerPrimitive.Root>
    </MessagePrimitive.Root>
  );
};

const MarkdownCodeHeader: FC<CodeHeaderProps> = ({ language }) => (
  <div className="border-border/50 bg-muted/50 mt-2.5 flex items-center justify-between rounded-t-lg border border-b-0 px-3 py-1.5 text-xs">
    <span className="text-muted-foreground font-medium lowercase">
      {language}
    </span>
  </div>
);

const MarkdownH1: FC<React.ComponentProps<"h1">> = ({
  className,
  ...props
}) => (
  <h1
    className={cn(
      "mb-2 scroll-m-20 text-base font-semibold first:mt-0 last:mb-0",
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
      "mt-3 mb-1.5 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0",
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
      "mt-2.5 mb-1 scroll-m-20 text-sm font-semibold first:mt-0 last:mb-0",
      className,
    )}
    {...props}
  />
);

const MarkdownP: FC<React.ComponentProps<"p">> = ({ className, ...props }) => (
  <p
    className={cn("my-2.5 leading-normal first:mt-0 last:mb-0", className)}
    {...props}
  />
);

const MarkdownUl: FC<React.ComponentProps<"ul">> = ({
  className,
  ...props
}) => (
  <ul
    className={cn(
      "marker:text-muted-foreground my-2 ml-4 list-disc [&>li]:mt-1",
      className,
    )}
    {...props}
  />
);

const MarkdownOl: FC<React.ComponentProps<"ol">> = ({
  className,
  ...props
}) => (
  <ol
    className={cn(
      "marker:text-muted-foreground my-2 ml-4 list-decimal [&>li]:mt-1",
      className,
    )}
    {...props}
  />
);

const MarkdownPre: FC<React.ComponentProps<"pre">> = ({
  className,
  ...props
}) => (
  <pre
    className={cn(
      "border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-lg border border-t-0 p-3 text-xs leading-relaxed",
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
        !isCodeBlock &&
          "border-border/50 bg-muted/50 rounded-md border px-1.5 py-0.5 font-mono text-[0.85em]",
        className,
      )}
      {...props}
    />
  );
};

const MarkdownLi: FC<React.ComponentProps<"li">> = ({
  className,
  ...props
}) => <li className={cn("leading-normal", className)} {...props} />;

const baseMarkdownComponents = {
  h1: MarkdownH1,
  h2: MarkdownH2,
  h3: MarkdownH3,
  p: MarkdownP,
  ul: MarkdownUl,
  ol: MarkdownOl,
  li: MarkdownLi,
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
      as="div"
      className="not-fumadocs-codeblock border-border/50 bg-muted/30 overflow-x-auto rounded-t-none rounded-b-lg border border-t-0 p-3 text-xs leading-relaxed [&_.line:last-child:empty]:hidden"
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
        className="aui-md"
        components={components}
      />
    );
  },
);

ConfigurableMarkdownText.displayName = "ConfigurableMarkdownText";
