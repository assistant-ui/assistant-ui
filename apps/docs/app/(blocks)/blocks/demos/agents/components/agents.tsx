"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AssistantChatTransport, useChatRuntime } from "@assistant-ui/ai-sdk";
import {
  AssistantRuntimeProvider,
  AttachmentPrimitive,
  AuiConfig,
  AuiIf,
  ComposerPrimitive,
  CompositeAttachmentAdapter,
  ErrorPrimitive,
  MessagePrimitive,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  ThreadPrimitive,
  Tools,
  WebSpeechDictationAdapter,
  useAui,
  useAuiState,
} from "@assistant-ui/react";
import { MarkdownTextPrimitive } from "@assistant-ui/react-markdown";
import {
  Add01Icon,
  ArrowDown02Icon,
  ArrowUp02Icon,
  Attachment01Icon,
  Cancel01Icon,
  Mic01Icon,
  MicOff01Icon,
} from "@hugeicons/core-free-icons";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import toolkit from "../toolkit";
import { AgentCard, newestToolCall } from "./agent";
import {
  TEMPLATES,
  clearAgent,
  getAgent,
  reach,
  useAgent,
  useTemplate,
  type Template,
} from "./store";
import { TemplateDialog } from "./template";
import {
  Icon,
  Menu,
  MenuItem,
  MenuPopup,
  MenuTrigger,
  Tip,
  field,
  focusRing,
  iconButton,
  inkButton,
  rItem,
  rSurface,
  textButton,
} from "./ui";

/* -------------------------------------------------------------------------- */
/* Runtime: one chat about one agent                                          */
/* -------------------------------------------------------------------------- */

const config = AuiConfig({ tools: Tools({ toolkit }) });

const subscribeNever = () => () => {};

/* Speech recognition is a browser feature, so the server answers no. */
function useCanDictate() {
  return useSyncExternalStore(
    subscribeNever,
    WebSpeechDictationAdapter.isSupported,
    () => false,
  );
}

function useDictationAdapter() {
  const supported = useCanDictate();
  return useMemo(
    () => (supported ? new WebSpeechDictationAdapter() : undefined),
    [supported],
  );
}

/* Tells the model, with every message, the agent as it stands when the message is sent, and the time zone a schedule is read in. */
function OpenAgent() {
  const aui = useAui();

  useEffect(
    () =>
      aui.modelContext.register({
        getModelContext: () => ({
          system: [
            `Time zone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`,
            `Open agent: ${JSON.stringify(getAgent())}`,
          ].join("\n"),
        }),
      }),
    [aui],
  );

  return null;
}

/* -------------------------------------------------------------------------- */
/* Frame: a bar to start over from, and the one page under it                 */
/* -------------------------------------------------------------------------- */

export function Agents() {
  const [transport] = useState(
    () => new AssistantChatTransport({ api: "/blocks/demos/agents/api/chat" }),
  );
  const [attachments] = useState(
    () =>
      new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
  );
  const dictation = useDictationAdapter();
  const runtime = useChatRuntime({
    transport,
    adapters: { attachments, dictation },
    // A tool runs in the browser, and its result goes back so the model can say what it set.
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <OpenAgent />
      <TooltipProvider delay={300}>
        <div className="bg-background text-foreground flex h-full flex-col text-sm">
          <Header />
          <Page />
        </div>
      </TooltipProvider>
    </AssistantRuntimeProvider>
  );
}

function Header() {
  const aui = useAui();
  const agent = useAgent();
  const empty = useAuiState((s) => s.thread.isEmpty);

  return (
    <header className="flex h-12 shrink-0 items-center px-3">
      {(agent || !empty) && (
        <button
          type="button"
          onClick={() => {
            clearAgent();
            aui.threads.switchToNewThread();
          }}
          className={cn(textButton, "gap-1.5 font-medium")}
        >
          <Icon icon={Add01Icon} className="size-4" />
          New agent
        </button>
      )}
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* The page: the templates or the agent, then the chat about it               */
/* -------------------------------------------------------------------------- */

function Page() {
  const agent = useAgent();
  const empty = useAuiState((s) => s.thread.isEmpty);

  // Until something is said, the page scrolls from its top with the message box floating over its foot.
  if (empty)
    return (
      <ThreadPrimitive.Root className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-4 pb-32">
          <div className="mx-auto w-full max-w-3xl pt-2">
            {agent ? <AgentCard agent={agent} /> : <Templates />}
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 px-4 pb-4">
          <div className="pointer-events-auto mx-auto w-full max-w-3xl">
            <Composer />
          </div>
        </div>
      </ThreadPrimitive.Root>
    );

  return (
    <ThreadPrimitive.Root className="flex min-h-0 flex-1 flex-col">
      <ThreadPrimitive.Viewport className="flex flex-1 flex-col overflow-y-auto px-4">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 pt-2 pb-10">
          <Start />
          <ThreadPrimitive.Messages>
            {() => <Message />}
          </ThreadPrimitive.Messages>
        </div>
        <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mx-auto mt-auto flex w-full max-w-3xl flex-col pb-4">
          <Tip label="Scroll to the newest message">
            <ThreadPrimitive.ScrollToBottom
              className={cn(
                iconButton,
                "bg-background border-border/60 absolute -top-10 self-center border disabled:invisible",
              )}
            >
              <Icon icon={ArrowDown02Icon} />
            </ThreadPrimitive.ScrollToBottom>
          </Tip>
          <Composer />
        </ThreadPrimitive.ViewportFooter>
      </ThreadPrimitive.Viewport>
    </ThreadPrimitive.Root>
  );
}

/* What a new chat shows: the agents to start from. A template opens before it is used. */
function Templates() {
  const [open, setOpen] = useState<Template | null>(null);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-3xl font-medium tracking-tight">Agents</h1>
        <p className="text-muted-foreground">
          Describe the agent you want, or start from a template.
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {TEMPLATES.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setOpen(template)}
              className={cn(
                field,
                rSurface,
                "hover:bg-foreground/[0.07] flex w-full items-center gap-6 px-4 py-3 text-start transition-colors motion-reduce:transition-none",
                focusRing,
              )}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium">{template.name}</span>
                <span className="text-muted-foreground leading-[1.375rem]">
                  {template.description}
                </span>
              </span>
              <span className="text-muted-foreground shrink-0 text-xs max-sm:hidden">
                {reach(template).join(" · ")}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <TemplateDialog template={open} onClose={() => setOpen(null)} />
    </div>
  );
}

/*
 * The head of a chat about a template: the agent, until a tool call draws a
 * newer card further down, and then a line naming the template.
 */
function Start() {
  const agent = useAgent();
  const template = useTemplate();
  const changed = useAuiState((s) => newestToolCall(s.thread.messages) !== "");

  if (!agent || !template) return null;
  if (changed)
    return <p className="text-muted-foreground">Started from {template}</p>;
  return <AgentCard agent={agent} />;
}

function Message() {
  const role = useAuiState((s) => s.message.role);
  return role === "user" ? <UserMessage /> : <AssistantMessage />;
}

function UserMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2 empty:hidden">
        <MessagePrimitive.Attachments>
          {() => <Attachment />}
        </MessagePrimitive.Attachments>
      </div>
      <div
        className={cn(
          field,
          "max-w-[80%] rounded-3xl px-4 py-2 leading-[1.375rem] wrap-break-word whitespace-pre-wrap",
        )}
      >
        <MessagePrimitive.Parts>
          {({ part }) => (part.type === "text" ? part.text : null)}
        </MessagePrimitive.Parts>
      </div>
    </MessagePrimitive.Root>
  );
}

const markdown =
  "flex flex-col gap-2 leading-[1.375rem] wrap-break-word [&_a]:underline [&_a]:underline-offset-2 [&_code]:bg-foreground/6 [&_code]:rounded-[6px] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.8125rem] [&_ol]:flex [&_ol]:list-decimal [&_ol]:flex-col [&_ol]:gap-1 [&_ol]:ps-5 [&_strong]:font-medium [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-1 [&_ul]:ps-5";

function AssistantMessage() {
  return (
    <MessagePrimitive.Root className="flex flex-col items-start gap-2.5">
      <MessagePrimitive.Parts>
        {({ part }) => {
          if (part.type === "text")
            return <MarkdownTextPrimitive className={markdown} />;
          // A tool call draws the receipt its toolkit entry renders.
          if (part.type === "tool-call") return part.toolUI ?? null;
          return null;
        }}
      </MessagePrimitive.Parts>
      <AuiIf
        condition={(s) =>
          s.message.status?.type === "running" && s.message.parts.length === 0
        }
      >
        <p
          role="status"
          className="text-muted-foreground animate-pulse motion-reduce:animate-none"
        >
          Working
        </p>
      </AuiIf>
      <MessagePrimitive.Error>
        <ErrorPrimitive.Root
          className={cn(
            rSurface,
            "border-destructive/25 text-destructive bg-destructive/5 border px-3.5 py-2.5",
          )}
        >
          <ErrorPrimitive.Message />
        </ErrorPrimitive.Root>
      </MessagePrimitive.Error>
    </MessagePrimitive.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Message box: always at the foot of the page                                */
/* -------------------------------------------------------------------------- */

/*
 * One row: add, the words, dictate, send. Attached files sit in a muted
 * strip that tucks behind the box.
 */
function Composer() {
  const agent = useAgent();
  const attached = useAuiState((s) => s.composer.attachments.length > 0);
  const addFiles = useRef<HTMLButtonElement>(null);

  return (
    <ComposerPrimitive.Root className="flex flex-col">
      <div
        inert={!attached}
        className={cn(
          "grid transition-[grid-template-rows,margin] duration-200 ease-out motion-reduce:transition-none",
          attached ? "-mb-4 grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="bg-muted border-border/60 mx-4 flex [scrollbar-width:thin] [scrollbar-color:var(--border)_transparent] gap-2 overflow-x-auto rounded-t-2xl border border-b-0 px-2 pt-2 pb-6">
            <ComposerPrimitive.Attachments>
              {() => <Attachment removable />}
            </ComposerPrimitive.Attachments>
          </div>
        </div>
      </div>
      {/*
       * The picker stays here, outside the menu that opens it: the primitive
       * drops a pick made after it has unmounted, as a closed menu's has.
       */}
      <ComposerPrimitive.AddAttachment ref={addFiles} hidden />
      <ComposerPrimitive.AttachmentDropzone className="bg-background border-border/60 data-[dragging=true]:border-foreground/40 relative flex flex-col rounded-[1.75rem] border p-1.5 shadow-(--float-shadow) transition-colors motion-reduce:transition-none">
        <AuiIf condition={(s) => s.composer.dictation != null}>
          <DictationStatus />
        </AuiIf>
        <div className="flex items-end gap-0.5">
          <Menu>
            <Tip label="Add" side="top">
              <MenuTrigger className={cn(iconButton, "group size-9")}>
                <Icon
                  icon={Add01Icon}
                  className="size-5 transition-transform duration-200 ease-out group-aria-expanded:rotate-45 motion-reduce:transition-none"
                />
              </MenuTrigger>
            </Tip>
            <MenuPopup side="top" className="min-w-44">
              <MenuItem onClick={() => addFiles.current?.click()}>
                <Icon icon={Attachment01Icon} />
                Add files
              </MenuItem>
            </MenuPopup>
          </Menu>
          <ComposerPrimitive.Input
            rows={1}
            placeholder={
              agent ? "Ask to change this agent" : "Describe an agent"
            }
            aria-label="Message"
            className="placeholder:text-muted-foreground/70 max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-base leading-6 outline-none"
          />
          <DictationButton />
          <AuiIf condition={(s) => s.thread.isRunning}>
            <Tip label="Stop" side="top">
              <ComposerPrimitive.Cancel className={cn(inkButton, "size-9")}>
                <span
                  aria-hidden
                  className="size-2.5 rounded-[2px] bg-current"
                />
              </ComposerPrimitive.Cancel>
            </Tip>
          </AuiIf>
          <AuiIf condition={(s) => !s.thread.isRunning}>
            <Tip label="Send" side="top">
              <ComposerPrimitive.Send className={cn(inkButton, "size-9")}>
                <Icon icon={ArrowUp02Icon} className="size-4.5" />
              </ComposerPrimitive.Send>
            </Tip>
          </AuiIf>
        </div>
      </ComposerPrimitive.AttachmentDropzone>
    </ComposerPrimitive.Root>
  );
}

function DictationButton() {
  const canDictate = useCanDictate();
  const dictating = useAuiState((s) => s.composer.dictation != null);
  if (!canDictate) return null;

  return dictating ? (
    <Tip label="Stop dictating" side="top">
      <ComposerPrimitive.StopDictation
        className={cn(
          iconButton,
          "bg-foreground/[0.07] text-foreground size-9",
        )}
      >
        <Icon icon={MicOff01Icon} className="size-4.5" />
      </ComposerPrimitive.StopDictation>
    </Tip>
  ) : (
    <Tip label="Dictate" side="top">
      <ComposerPrimitive.Dictate
        className={cn(iconButton, "text-foreground size-9")}
      >
        <Icon icon={Mic01Icon} className="size-4.5" />
      </ComposerPrimitive.Dictate>
    </Tip>
  );
}

/* While dictating: the words being heard, or a note that it is listening. */
function DictationStatus() {
  const hearing = useAuiState((s) => Boolean(s.composer.dictation?.transcript));

  return (
    <div className="text-muted-foreground flex items-center gap-2 px-3 pt-1.5 pb-0.5">
      <span
        aria-hidden
        className="bg-destructive size-1.5 shrink-0 animate-pulse rounded-full motion-reduce:animate-none"
      />
      {hearing ? (
        <ComposerPrimitive.DictationTranscript className="min-w-0 truncate" />
      ) : (
        <span role="status">Listening</span>
      )}
    </div>
  );
}

/* An attached file: in the message box before it is sent, and on the message after. */
function Attachment({ removable = false }: { removable?: boolean }) {
  return (
    <AttachmentPrimitive.Root
      className={cn(
        rItem,
        "border-border/60 bg-background flex h-9 max-w-56 shrink-0 items-center gap-2 border ps-1.5 pe-2.5",
      )}
    >
      <AttachmentPrimitive.unstable_Thumb className="bg-foreground/[0.06] text-muted-foreground flex h-6 min-w-6 items-center justify-center rounded-md px-1 font-mono text-[10px]" />
      <span className="min-w-0 flex-1 truncate">
        <AttachmentPrimitive.Name />
      </span>
      {removable && (
        <Tip label="Remove the file" side="top">
          <AttachmentPrimitive.Remove
            className={cn(iconButton, "-me-2 size-6")}
          >
            <Icon icon={Cancel01Icon} />
          </AttachmentPrimitive.Remove>
        </Tip>
      )}
    </AttachmentPrimitive.Root>
  );
}
