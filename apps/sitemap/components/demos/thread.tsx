"use client";

import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AuiConfig,
  AuiIf,
  ComposerPrimitive,
  MessagePrimitive,
  SuggestionPrimitive,
  Suggestions,
  ThreadPrimitive,
  Tools,
  defineToolkit,
  useAuiState,
  type SuggestionAdapter,
} from "@assistant-ui/react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import {
  ArrowUpIcon,
  CheckIcon,
  CopyIcon,
  RefreshCwIcon,
  SquareIcon,
} from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

export const PROMPTS = ["How does it work?", "How do I set it up?"];

const COMMAND = "npx shadcn@latest add @assistant-ui/thread";

const AGENT_PROMPT =
  "install and set up assistant-ui with `npx assistant-ui@latest setup --products elements/thread`";

/** After each reply, offers the questions other than the one just asked. */
export const followUps: SuggestionAdapter = {
  async generate({ messages }) {
    const asked = messages
      .findLast((message) => message.role === "user")
      ?.content.map((part) => (part.type === "text" ? part.text : ""))
      .join("");
    return PROMPTS.filter((prompt) => prompt !== asked).map((prompt) => ({
      prompt,
    }));
  },
};

/** The route defines `showSetup`; when the model calls it, the thread draws this card. */
export const toolkit = defineToolkit({
  showSetup: {
    type: "backend",
    display: "standalone",
    render: SetupCard,
  },
});

export default function ThreadDemo() {
  const runtime = useChatRuntime({
    transport: new AssistantChatTransport({ api: "/api/chat" }),
    adapters: { suggestion: followUps },
  });
  const config = AuiConfig({
    suggestions: Suggestions(PROMPTS),
    tools: Tools({ toolkit }),
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Thread />
    </AssistantRuntimeProvider>
  );
}

export function Thread() {
  return (
    <ThreadPrimitive.Root
      data-slot="thread"
      className="bg-background flex h-full flex-col"
    >
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 pt-6">
          <AuiIf condition={(s) => s.thread.isEmpty}>
            <Welcome />
          </AuiIf>
          <ThreadPrimitive.Messages>
            {() => <Message />}
          </ThreadPrimitive.Messages>
          <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mt-auto flex flex-col gap-3 pb-4">
            <FollowUps />
            <Composer />
          </ThreadPrimitive.ViewportFooter>
        </div>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

function Welcome() {
  return (
    <div
      data-slot="welcome"
      className="m-auto flex w-full max-w-sm flex-col items-center gap-5"
    >
      <h2 className="text-lg font-medium">Thread</h2>
      <div className="flex w-full flex-col gap-1.5">
        <ThreadPrimitive.Suggestions>
          {() => (
            <SuggestionPrimitive.Trigger send className={suggestionRow}>
              <SuggestionPrimitive.Title />
            </SuggestionPrimitive.Trigger>
          )}
        </ThreadPrimitive.Suggestions>
      </div>
    </div>
  );
}

function FollowUps() {
  const suggestions = useAuiState((s) => s.thread.suggestions);

  return (
    <AuiIf
      condition={(s) =>
        !s.thread.isEmpty &&
        !s.thread.isRunning &&
        s.thread.suggestions.length > 0
      }
    >
      <div data-slot="follow-ups" className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
          <ThreadPrimitive.Suggestion
            key={suggestion.prompt}
            prompt={suggestion.prompt}
            send
            className={suggestionChip}
          >
            {suggestion.title ?? suggestion.prompt}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </AuiIf>
  );
}

function Message() {
  const role = useAuiState((s) => s.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root
      data-slot="user-message"
      className="flex justify-end"
    >
      <div className="bg-muted max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-6 wrap-break-word">
        <MessagePrimitive.Parts />
      </div>
    </MessagePrimitive.Root>
  );
}

function AssistantMessage() {
  return (
    <MessagePrimitive.Root
      data-slot="assistant-message"
      className="flex flex-col gap-1.5"
    >
      <div className="flex flex-col gap-3 text-sm leading-6 wrap-break-word">
        <MessagePrimitive.Parts components={{ Text: MarkdownText }} />
      </div>
      <ActionBar />
    </MessagePrimitive.Root>
  );
}

function ActionBar() {
  return (
    <ActionBarPrimitive.Root
      data-slot="action-bar"
      hideWhenRunning
      autohide="not-last"
      className="text-muted-foreground -ms-1.5 flex w-fit gap-0.5"
    >
      <ActionBarPrimitive.Copy aria-label="Copy" className={iconButton}>
        <CopyIcon className="size-3.5" />
      </ActionBarPrimitive.Copy>
      <ActionBarPrimitive.Reload aria-label="Retry" className={iconButton}>
        <RefreshCwIcon className="size-3.5" />
      </ActionBarPrimitive.Reload>
    </ActionBarPrimitive.Root>
  );
}

function MarkdownText() {
  return (
    <MarkdownTextPrimitive className="[&_code]:bg-foreground/[0.06] [&_code]:rounded-sm [&_code]:px-1 [&_code]:font-mono [&_code]:text-[13px] [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:ps-5 [&_p+p]:mt-3" />
  );
}

function SetupCard() {
  return (
    <div
      data-slot="setup-card"
      className="border-foreground/10 my-1 flex w-full flex-col overflow-hidden rounded-xl border"
    >
      <CopyRow label="Terminal" value={COMMAND} />
      <CopyRow label="Prompt" value={AGENT_PROMPT} divided />
    </div>
  );
}

function CopyRow({
  label,
  value,
  divided = false,
}: {
  label: string;
  value: string;
  divided?: boolean;
}) {
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 1500,
  });

  return (
    <div
      className={`border-foreground/10 flex flex-col gap-1.5 p-3 ${divided ? "border-t" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">{label}</span>
        <button
          type="button"
          onClick={() => copyToClipboard(value)}
          aria-label={
            copied ? `${label} copied` : `Copy ${label.toLowerCase()}`
          }
          className={iconButton}
        >
          {copied ? (
            <CheckIcon className="size-3.5" />
          ) : (
            <CopyIcon className="size-3.5" />
          )}
        </button>
      </div>
      <code className="font-mono text-[13px] leading-5 wrap-break-word">
        {value}
      </code>
    </div>
  );
}

function Composer() {
  return (
    <ComposerPrimitive.Root
      data-slot="composer"
      className="border-foreground/10 focus-within:border-foreground/25 bg-background flex items-end gap-2 rounded-2xl border p-2 transition-colors"
    >
      <ComposerPrimitive.Input
        rows={1}
        placeholder="Message"
        aria-label="Message"
        className="placeholder:text-muted-foreground max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm leading-6 outline-none"
      />
      <AuiIf condition={(s) => !s.thread.isRunning}>
        <ComposerPrimitive.Send aria-label="Send" className={roundButton}>
          <ArrowUpIcon className="size-4" />
        </ComposerPrimitive.Send>
      </AuiIf>
      <AuiIf condition={(s) => s.thread.isRunning}>
        <ComposerPrimitive.Cancel aria-label="Stop" className={roundButton}>
          <SquareIcon className="size-3 fill-current" />
        </ComposerPrimitive.Cancel>
      </AuiIf>
    </ComposerPrimitive.Root>
  );
}

const suggestionRow =
  "border-foreground/10 hover:bg-foreground/[0.03] hover:border-foreground/25 rounded-xl border px-4 py-2.5 text-start text-sm transition-colors disabled:opacity-50";

const suggestionChip =
  "border-foreground/10 hover:bg-foreground/[0.03] hover:border-foreground/25 rounded-full border px-3 py-1 text-sm transition-colors disabled:opacity-50";

const iconButton =
  "hover:text-foreground hover:bg-foreground/5 flex size-7 items-center justify-center rounded-md transition-colors";

const roundButton =
  "bg-foreground text-background flex size-8 shrink-0 items-center justify-center rounded-full transition-opacity disabled:opacity-30";
