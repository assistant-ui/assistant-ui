"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AssistantChatTransport,
  getThreadMessageTokenUsage,
  useChatRuntime,
} from "@assistant-ui/ai-sdk";
import {
  ActionBarPrimitive,
  AssistantRuntimeProvider,
  AttachmentPrimitive,
  AuiIf,
  ComposerPrimitive,
  ErrorPrimitive,
  MessagePrimitive,
  SimpleImageAttachmentAdapter,
  ThreadListPrimitive,
  ThreadPrimitive,
  WebSpeechDictationAdapter,
  useAui,
  useAuiEvent,
  useAuiState,
  type ThreadMessage,
} from "@assistant-ui/react";
import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowDown02Icon,
  ArrowUp02Icon,
  Cancel01Icon,
  Download01Icon,
  Image01Icon,
  Mic01Icon,
  MicOff01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import type { UIMessage } from "ai";
import { useAttachmentSrc } from "@/hooks/use-attachment-src";
import { cn } from "@/lib/utils";
import { ChatList, ChatSidebar, ChatSidebarTrigger } from "../../chat-sidebar";
import { Gallery, RatioChoices, RatioGlyph } from "./gallery";
import {
  OptionsProvider,
  QUALITIES,
  RATIOS,
  addMade,
  shapeOf,
  useOptions,
} from "./state";
import {
  Icon,
  Menu,
  MenuChoice,
  MenuItem,
  MenuLabel,
  MenuPopup,
  MenuRadioGroup,
  MenuSeparator,
  MenuTrigger,
  Tip,
  field,
  iconButton,
  inkButton,
  rItem,
  rSurface,
  textButton,
} from "./ui";
import { User } from "./user";

/* -------------------------------------------------------------------------- */
/* Runtime: each chat is one picture and the changes asked of it              */
/* -------------------------------------------------------------------------- */

const isPicture = (part: UIMessage["parts"][number]) =>
  part.type === "file" && part.mediaType.startsWith("image/");

/*
 * The route needs the newest request and the newest picture, which a
 * follow-up changes. Earlier pictures stay in the page, so a long chat does
 * not send every one of them again.
 */
function newest(messages: readonly UIMessage[]) {
  const asked = messages.findLast((message) => message.role === "user");
  const pictured = messages.findLast(
    (message) => message.role === "assistant" && message.parts.some(isPicture),
  );
  return [
    ...(pictured
      ? [{ ...pictured, parts: pictured.parts.filter(isPicture).slice(-1) }]
      : []),
    ...(asked ? [asked] : []),
  ];
}

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

const textOf = (message: ThreadMessage | undefined) =>
  (message?.content ?? [])
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
    .trim();

const titleOf = (text: string) =>
  text.length > 60 ? `${text.slice(0, 57).trimEnd()}...` : text;

/*
 * A chat is named after its first request, and each picture that arrives is
 * added to My images.
 */
function Bookkeeping() {
  const aui = useAui();

  useAuiEvent("thread.runEnd", () => {
    const { messages } = aui.thread.getState();
    const chat = aui.threads.item("main");
    const first = textOf(messages.find((message) => message.role === "user"));
    if (!chat.getState().title && first) chat.rename(titleOf(first));

    const reply = messages.at(-1);
    if (reply?.role !== "assistant") return;
    const picture = reply.content.find(
      (part) => part.type === "file" && part.mimeType.startsWith("image/"),
    );
    if (picture?.type !== "file") return;
    addMade({
      id: reply.id,
      src: picture.data,
      prompt: textOf(messages.at(-2)),
      tokens: getThreadMessageTokenUsage(reply)?.totalTokens ?? 0,
    });
  });

  return null;
}

/* -------------------------------------------------------------------------- */
/* Frame: the shared sidebar of chats, and the one page beside it             */
/* -------------------------------------------------------------------------- */

export function Images() {
  const [transport] = useState(
    () =>
      new AssistantChatTransport({
        api: "/blocks/demos/images/api/chat",
        prepareSendMessagesRequest: (options) => ({
          body: {
            ...options.body,
            id: options.id,
            messages: newest(options.messages),
            trigger: options.trigger,
            messageId: options.messageId,
            metadata: options.requestMetadata,
          },
        }),
      }),
  );
  const [attachments] = useState(() => new SimpleImageAttachmentAdapter());
  const dictation = useDictationAdapter();
  const runtime = useChatRuntime({
    transport,
    adapters: { attachments, dictation },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Bookkeeping />
      <OptionsProvider>
        <ChatSidebar
          title="Images"
          list={<ChatList label="New image" heading="Recent" />}
          footer={<User />}
        >
          <Header />
          <Thread />
        </ChatSidebar>
      </OptionsProvider>
    </AssistantRuntimeProvider>
  );
}

function Header() {
  const title = useAuiState((s) => s.threadListItem.title);
  const empty = useAuiState((s) => s.thread.isEmpty);

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 px-3">
      <ChatSidebarTrigger />
      <p className="min-w-0 flex-1 truncate font-medium">
        {empty ? "" : title || "New image"}
      </p>
      <Tip label="New image">
        <ThreadListPrimitive.New className={cn(iconButton, "md:hidden")}>
          <Icon icon={Add01Icon} />
        </ThreadListPrimitive.New>
      </Tip>
    </header>
  );
}

/* -------------------------------------------------------------------------- */
/* The page: the gallery until a picture is asked for, then the chat          */
/* -------------------------------------------------------------------------- */

function Thread() {
  const empty = useAuiState((s) => s.thread.isEmpty);

  // The gallery scrolls on its own, from its top, with the message box floating over its foot.
  if (empty)
    return (
      <ThreadPrimitive.Root className="relative flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-4 pb-32">
          <Gallery />
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
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 pt-2 pb-10">
          <ThreadPrimitive.Messages>
            {() => <Message />}
          </ThreadPrimitive.Messages>
        </div>
        <ThreadPrimitive.ViewportFooter className="bg-background sticky bottom-0 mx-auto mt-auto flex w-full max-w-3xl flex-col pb-4">
          <Tip label="Scroll to the newest picture">
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

function AssistantMessage() {
  const { ratio } = useOptions();

  return (
    <MessagePrimitive.Root className="flex flex-col items-start gap-2">
      <MessagePrimitive.Parts>
        {({ part }) =>
          part.type === "file" && part.mimeType.startsWith("image/") ? (
            <Picture src={part.data} />
          ) : part.type === "text" ? (
            <p className="leading-[1.375rem]">{part.text}</p>
          ) : null
        }
      </MessagePrimitive.Parts>
      <AuiIf
        condition={(s) =>
          s.message.status?.type === "running" && s.message.parts.length === 0
        }
      >
        {/* The space the picture will take, in the shape that was asked for. */}
        <div
          role="status"
          style={{ aspectRatio: shapeOf(ratio) }}
          className={cn(
            field,
            rSurface,
            "text-muted-foreground flex max-h-[60dvh] w-80 max-w-full animate-pulse items-end p-4 motion-reduce:animate-none",
          )}
        >
          Making your picture
        </div>
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

/* A picture that was made, with the request that made it as its description. */
function Picture({ src }: { src: string }) {
  const aui = useAui();
  const { ratio, quality } = useOptions();
  const asked = useAuiState((s) =>
    textOf(s.thread.messages[s.message.index - 1]),
  );

  return (
    <>
      <img
        src={src}
        alt={asked || "The picture that was made"}
        className={cn(
          rSurface,
          "border-border/60 max-h-[60dvh] w-auto max-w-full border",
        )}
      />
      <ActionBarPrimitive.Root hideWhenRunning className="flex gap-0.5">
        <Tip label="Download">
          <a href={src} download="picture.webp" className={iconButton}>
            <Icon icon={Download01Icon} />
          </a>
        </Tip>
        <Tip label="Make it again">
          <button
            type="button"
            className={iconButton}
            onClick={() =>
              aui.message.reload({
                runConfig: {
                  custom: { ...(ratio !== "auto" && { ratio }), quality },
                },
              })
            }
          >
            <Icon icon={RefreshIcon} />
          </button>
        </Tip>
      </ActionBarPrimitive.Root>
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Message box: what to make, in what shape, with how much detail             */
/* -------------------------------------------------------------------------- */

/*
 * One row: add, the words, how much detail, dictate, send. Pictures attached
 * as a starting point sit in a muted strip that tucks behind the box.
 */
function Composer() {
  const aui = useAui();
  const { ratio, quality, inputRef } = useOptions();
  const empty = useAuiState((s) => s.thread.isEmpty);
  const attached = useAuiState((s) => s.composer.attachments.length > 0);
  const addImages = useRef<HTMLButtonElement>(null);

  return (
    <ComposerPrimitive.Root
      // The choices ride along with the message as its run config, which the route reads.
      onSubmit={() =>
        aui.composer.setRunConfig({
          custom: { ...(ratio !== "auto" && { ratio }), quality },
        })
      }
      className="flex flex-col"
    >
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
      <ComposerPrimitive.AddAttachment ref={addImages} hidden />
      <ComposerPrimitive.AttachmentDropzone className="bg-background border-border/60 data-[dragging=true]:border-foreground/40 relative flex flex-col rounded-[1.75rem] border p-1.5 shadow-(--float-shadow) transition-colors motion-reduce:transition-none">
        <AuiIf condition={(s) => s.composer.dictation != null}>
          <DictationStatus />
        </AuiIf>
        <div className="flex items-end gap-0.5">
          <AddMenu onAddImages={() => addImages.current?.click()} />
          <ComposerPrimitive.Input
            ref={inputRef}
            rows={1}
            placeholder={empty ? "Describe a new image" : "Describe a change"}
            aria-label="Describe the picture"
            className="placeholder:text-muted-foreground/70 max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-base leading-6 outline-none"
          />
          {ratio !== "auto" && <RatioMenu />}
          <QualityMenu />
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
            <Tip label="Make the picture" side="top">
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

/* What a request can carry, and the shape to make it in. The plus turns to a cross while its menu is open. */
function AddMenu({ onAddImages }: { onAddImages: () => void }) {
  const { ratio, setRatio } = useOptions();

  return (
    <Menu>
      <Tip label="Add" side="top">
        <MenuTrigger className={cn(iconButton, "group size-9")}>
          <Icon
            icon={Add01Icon}
            className="size-5 transition-transform duration-200 ease-out group-aria-expanded:rotate-45 motion-reduce:transition-none"
          />
        </MenuTrigger>
      </Tip>
      <MenuPopup side="top" className="min-w-48">
        <MenuItem onClick={onAddImages}>
          <Icon icon={Image01Icon} />
          Add images
        </MenuItem>
        <MenuSeparator />
        <MenuLabel>Aspect ratio</MenuLabel>
        <RatioChoices value={ratio} onValueChange={setRatio} />
      </MenuPopup>
    </Menu>
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

/* An attached picture: in the message box before it is sent, and on the message after. */
function Attachment({ removable = false }: { removable?: boolean }) {
  const name = useAuiState((s) => s.attachment.name);
  const src = useAttachmentSrc();

  return (
    <AttachmentPrimitive.Root
      className={cn(
        field,
        rItem,
        "border-border/60 relative size-14 shrink-0 overflow-hidden border",
      )}
    >
      {src && <img src={src} alt={name} className="size-full object-cover" />}
      {removable && (
        <Tip label="Remove the image" side="top">
          <AttachmentPrimitive.Remove
            className={cn(
              iconButton,
              "bg-background/90 text-foreground hover:bg-background absolute end-0.5 top-0.5 size-5",
            )}
          >
            <Icon icon={Cancel01Icon} />
          </AttachmentPrimitive.Remove>
        </Tip>
      )}
    </AttachmentPrimitive.Root>
  );
}

function RatioMenu() {
  const { ratio, setRatio } = useOptions();
  const current = RATIOS.find((entry) => entry.value === ratio);

  return (
    <Menu>
      <MenuTrigger className={cn(textButton, "text-muted-foreground h-9")}>
        <RatioGlyph shape={current?.shape ?? "1 / 1"} />
        {current?.label}
      </MenuTrigger>
      <MenuPopup side="top" align="end">
        <MenuLabel>Aspect ratio</MenuLabel>
        <RatioChoices value={ratio} onValueChange={setRatio} />
      </MenuPopup>
    </Menu>
  );
}

function QualityMenu() {
  const { quality, setQuality } = useOptions();
  const current = QUALITIES.find((entry) => entry.value === quality);

  return (
    <Menu>
      <MenuTrigger className={cn(textButton, "text-muted-foreground h-9")}>
        {current?.label}
        <Icon icon={ArrowDown01Icon} className="size-3.5" />
      </MenuTrigger>
      <MenuPopup side="top" align="end">
        <MenuLabel>Detail</MenuLabel>
        <MenuRadioGroup value={quality} onValueChange={setQuality}>
          {QUALITIES.map((entry) => (
            <MenuChoice key={entry.value} value={entry.value}>
              {entry.label}
              <span className="text-muted-foreground">{entry.note}</span>
            </MenuChoice>
          ))}
        </MenuRadioGroup>
      </MenuPopup>
    </Menu>
  );
}
