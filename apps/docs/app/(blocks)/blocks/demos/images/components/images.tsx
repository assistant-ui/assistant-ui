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
  ArrowDown02Icon,
  ArrowUp02Icon,
  Cancel01Icon,
  Mic01Icon,
  MicOff01Icon,
  RefreshIcon,
} from "@hugeicons/core-free-icons";
import type { UIMessage } from "ai";
import { Image } from "@/components/assistant-ui/elements/image";
import { ImageGallery } from "@/components/assistant-ui/elements/image-gallery";
import { useAttachmentSrc } from "@/hooks/use-attachment-src";
import { cn } from "@/lib/utils";
import { ChatList, ChatSidebar, ChatSidebarTrigger } from "../../chat-sidebar";
import { EditorFrame, useEditor } from "./editor";
import { Gallery } from "./gallery";
import { ModelPicker } from "./models";
import { AddMenu } from "./settings";
import { OptionsProvider, addMade, shapeOf, useOptions } from "./state";
import {
  Icon,
  Tip,
  field,
  focusRing,
  iconButton,
  inkButton,
  rItem,
  rSurface,
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

type Part = ThreadMessage["content"][number];

const textOf = (message: ThreadMessage | undefined) =>
  (message?.content ?? [])
    .flatMap((part) => (part.type === "text" ? [part.text] : []))
    .join("\n")
    .trim();

const picturesOf = (parts: readonly Part[]) =>
  parts.flatMap((part) =>
    part.type === "file" && part.mimeType.startsWith("image/")
      ? [part.data]
      : [],
  );

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
    const prompt = textOf(messages.at(-2));
    const tokens = getThreadMessageTokenUsage(reply)?.totalTokens ?? 0;
    picturesOf(reply.content).forEach((src, index) =>
      // The reply's tokens are counted once, on its first picture.
      addMade({
        id: `${reply.id}:${index}`,
        src,
        prompt,
        tokens: index === 0 ? tokens : 0,
      }),
    );
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
  const [query, setQuery] = useState("");
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
          history
          search={{ query, onQueryChange: setQuery, label: "Search images" }}
          defaultOpen={false}
          list={<ChatList label="New image" heading="Recent" query={query} />}
          footer={<User />}
        >
          <EditorFrame>
            <Header />
            <Thread />
          </EditorFrame>
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
        <ThreadListPrimitive.New className={iconButton}>
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

/*
 * A reply is its pictures: one stands alone with its actions, several share
 * a grid and one full-screen view. Until the first arrives, the reply holds
 * its place in the shape that was asked for.
 */
function AssistantMessage() {
  const aui = useAui();
  const editor = useEditor();
  const { runConfig } = useOptions();
  const parts = useAuiState((s) => s.message.parts);
  const running = useAuiState((s) => s.message.status?.type === "running");
  const blocked = useAuiState(
    (s) =>
      s.message.status?.type === "incomplete" &&
      s.message.status.reason === "content-filter",
  );
  const asked = useAuiState((s) =>
    textOf(s.thread.messages[s.message.index - 1]),
  );
  const pictures = useMemo(() => picturesOf(parts), [parts]);
  const [single] = pictures;
  const preview = useMemo(() => previewOf(parts), [parts]);
  const alt = asked || "The picture that was made";
  const makeAgain = () => aui.message.reload({ runConfig });

  return (
    <MessagePrimitive.Root className="flex flex-col items-start gap-2">
      {pictures.length > 1 ? (
        <>
          <ImageGallery
            images={pictures.map((src, index) => ({
              id: String(index),
              src,
              alt: `${alt} (${index + 1} of ${pictures.length})`,
              caption: asked,
            }))}
            maxVisible={pictures.length}
            // Two or four pictures sit two to a row.
            className={cn(
              "max-w-xl",
              pictures.length !== 3 && "*:@sm:grid-cols-2",
            )}
          />
          <ActionBarPrimitive.Root hideWhenRunning className="flex gap-0.5">
            <Tip label="Make them again">
              <button type="button" className={iconButton} onClick={makeAgain}>
                <Icon icon={RefreshIcon} />
              </button>
            </Tip>
          </ActionBarPrimitive.Root>
        </>
      ) : single ? (
        <>
          <Image.Root size="lg" className={rSurface}>
            <Image.Zoom src={single} alt={alt}>
              <Image.Preview
                src={single}
                alt={alt}
                className="max-h-[60dvh] w-auto max-w-full"
              />
            </Image.Zoom>
            <button
              type="button"
              onClick={() => editor.open({ src: single, prompt: asked })}
              className={cn(
                "absolute start-3 bottom-3 flex h-8 items-center rounded-full bg-black/75 px-3.5 text-sm font-medium text-white transition-colors hover:bg-black/90 motion-reduce:transition-none",
                focusRing,
              )}
            >
              Edit
            </button>
          </Image.Root>
          <ActionBarPrimitive.Root hideWhenRunning>
            <Image.Actions
              part={{ type: "image", image: single }}
              onRegenerate={makeAgain}
              className="p-0"
            />
          </ActionBarPrimitive.Root>
        </>
      ) : running ? (
        <Pending preview={preview} />
      ) : null}
      {blocked && (
        <Image.Root size="sm" className={rSurface}>
          <Image.ContentFilterError reason="The provider blocked this request." />
        </Image.Root>
      )}
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

/* The newest partial picture the route has sent ahead of the finished one. */
const previewOf = (parts: readonly Part[]) => {
  const partial = parts.findLast(
    (part) => part.type === "data" && part.name === "partial",
  );
  const url: unknown = partial?.type === "data" ? partial.data?.url : undefined;
  return typeof url === "string" ? url : undefined;
};

/* The place a picture will take: a partial one as it arrives, or the shape that was asked for. */
function Pending({ preview }: { preview: string | undefined }) {
  const { settings } = useOptions();

  if (preview)
    return (
      <Image.Root size="lg" role="status" className={rSurface}>
        <Image.Preview
          src={preview}
          alt="Your picture so far"
          className="max-h-[60dvh] w-auto max-w-full animate-pulse motion-reduce:animate-none"
        />
      </Image.Root>
    );

  return (
    <Image.Root
      role="status"
      style={{ aspectRatio: shapeOf(settings.orientation) }}
      className={cn(rSurface, "max-h-[60dvh] w-80 max-w-full")}
    >
      <Image.Generating className="size-full" />
    </Image.Root>
  );
}

/* -------------------------------------------------------------------------- */
/* Message box: what to make, with which model and settings                   */
/* -------------------------------------------------------------------------- */

/*
 * One row: add and settings, the words, the model, dictate, send. Pictures
 * attached as a starting point sit in a muted strip that tucks behind the box.
 */
function Composer() {
  const aui = useAui();
  const { runConfig, inputRef } = useOptions();
  const empty = useAuiState((s) => s.thread.isEmpty);
  const attached = useAuiState((s) => s.composer.attachments.length > 0);
  const addImages = useRef<HTMLButtonElement>(null);

  return (
    <ComposerPrimitive.Root
      // The model and the settings ride along with the message as its run config, which the route reads.
      onSubmit={() => aui.composer.setRunConfig(runConfig)}
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
      <ComposerPrimitive.AttachmentDropzone className="bg-background/70 border-border/60 data-[dragging=true]:border-foreground/40 relative flex flex-col rounded-[1.75rem] border p-1.5 shadow-(--float-shadow) backdrop-blur-sm transition-colors motion-reduce:transition-none">
        <AuiIf condition={(s) => s.composer.dictation != null}>
          <DictationStatus />
        </AuiIf>
        {/* A phone has no room for the words beside the controls, so they take a row of their own above. */}
        <div className="flex items-end gap-0.5 max-sm:flex-wrap">
          <AddMenu onAddImages={() => addImages.current?.click()} />
          <ComposerPrimitive.Input
            ref={inputRef}
            rows={1}
            placeholder={empty ? "Describe a new image" : "Describe a change"}
            aria-label="Describe the picture"
            className="placeholder:text-muted-foreground/70 max-h-40 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-1.5 py-1.5 text-base leading-6 outline-none max-sm:order-first max-sm:basis-full max-sm:px-3"
          />
          <ModelPicker />
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
