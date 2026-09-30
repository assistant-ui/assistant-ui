import { useMemo, type ComponentProps, type ReactNode } from "react";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  InMemoryThreadListAdapter,
  MessagePrimitive,
  ThreadPrimitive,
  Tools,
  useLocalRuntime,
  useAuiState,
  useRemoteThreadListRuntime,
  type ChatModelAdapter,
  type RemoteThreadListAdapter,
  type ThreadMessageLike,
  type Toolkit,
} from "@assistant-ui/react";
import { Thread } from "@assistant-ui/ui/components/assistant-ui/elements/thread.aui.tsx";
import { cn } from "@/lib/utils";

type RemoteThreadListResponse = Awaited<
  ReturnType<RemoteThreadListAdapter["list"]>
>;
type RemoteThreadMetadata = Awaited<
  ReturnType<RemoteThreadListAdapter["fetch"]>
>;

/** Answers every new message with one line, so sections never hit a backend. */
const galleryModel: ChatModelAdapter = {
  async *run() {
    yield { content: [{ type: "text", text: "This is a gallery reply." }] };
  },
};

export const DEFAULT_MESSAGES: ThreadMessageLike[] = [
  { role: "user", content: "How does the webview reach my backend?" },
  {
    role: "assistant",
    content:
      "It tunnels `fetch` over `postMessage`: the extension host runs your route handler and streams the response back to the webview.",
  },
];

export type SeededThreadItem = {
  id: string;
  title: string;
  archived?: boolean;
  lastMessageAt?: Date;
};

class SeededThreadListAdapter extends InMemoryThreadListAdapter {
  constructor(private readonly threads: readonly SeededThreadItem[]) {
    super();
  }

  private metadata(thread: SeededThreadItem): RemoteThreadMetadata {
    return {
      remoteId: thread.id,
      title: thread.title,
      status: thread.archived ? "archived" : "regular",
      ...(thread.lastMessageAt && { lastMessageAt: thread.lastMessageAt }),
    };
  }

  override list(): Promise<RemoteThreadListResponse> {
    return Promise.resolve({
      threads: this.threads.map((t) => this.metadata(t)),
    });
  }

  override fetch(threadId: string): Promise<RemoteThreadMetadata> {
    const thread = this.threads.find((t) => t.id === threadId);
    return thread
      ? Promise.resolve(this.metadata(thread))
      : super.fetch(threadId);
  }
}

type SeededRuntimeProps = {
  /** The messages of the main thread. */
  messages?: readonly ThreadMessageLike[];
  /** Tool UIs (and frontend tools) registered for the section. */
  tools?: Toolkit;
  children: ReactNode;
};

function useSeededThreadRuntime(messages: readonly ThreadMessageLike[]) {
  return useLocalRuntime(galleryModel, { initialMessages: messages });
}

function Provider({
  runtime,
  tools,
  children,
}: {
  runtime: ReturnType<typeof useLocalRuntime>;
  tools: Toolkit | undefined;
  children: ReactNode;
}) {
  const config = useMemo(
    () => (tools ? AuiConfig({ tools: Tools({ toolkit: tools }) }) : undefined),
    [tools],
  );
  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      {children}
    </AssistantRuntimeProvider>
  );
}

function LocalSeededRuntime({
  messages = DEFAULT_MESSAGES,
  tools,
  children,
}: SeededRuntimeProps) {
  const runtime = useSeededThreadRuntime(messages);
  return (
    <Provider runtime={runtime} tools={tools}>
      {children}
    </Provider>
  );
}

function ThreadListSeededRuntime({
  messages = DEFAULT_MESSAGES,
  tools,
  threads,
  children,
}: SeededRuntimeProps & { threads: readonly SeededThreadItem[] }) {
  const adapter = useMemo(
    () => new SeededThreadListAdapter(threads),
    [threads],
  );
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: function useThreadRuntime() {
      return useSeededThreadRuntime(messages);
    },
    adapter,
  });
  return (
    <Provider runtime={runtime} tools={tools}>
      {children}
    </Provider>
  );
}

/**
 * A local runtime seeded with `messages` (default: a short exchange) that
 * never calls a backend. With `threads`, the thread list lists them too.
 * Components built on thread, message or thread-list primitives render
 * inside it.
 */
export function SeededRuntime({
  threads,
  ...props
}: SeededRuntimeProps & { threads?: readonly SeededThreadItem[] }) {
  return threads ? (
    <ThreadListSeededRuntime threads={threads} {...props} />
  ) : (
    <LocalSeededRuntime {...props} />
  );
}

/** The kit's full `Thread` over seeded messages, in a box of fixed height. */
export function SeededThread({
  className,
  ...props
}: Omit<SeededRuntimeProps, "children"> & { className?: string }) {
  return (
    <SeededRuntime {...props}>
      <div className={cn("h-120", className)}>
        <Thread />
      </div>
    </SeededRuntime>
  );
}

type PartComponents = ComponentProps<
  typeof MessagePrimitive.Parts
>["components"];

function SeededMessage({ components }: { components: PartComponents }) {
  const role = useAuiState((s) => s.message.role);
  return (
    <MessagePrimitive.Root
      data-role={role}
      className={cn(
        "min-w-0",
        role === "user" && "bg-muted self-end rounded-lg px-3 py-2",
      )}
    >
      <MessagePrimitive.Parts components={components} />
    </MessagePrimitive.Root>
  );
}

/**
 * Only the seeded messages, each rendering its parts with `components` (for
 * example `{ Text: MarkdownText }`), without the thread's viewport, composer
 * or action bars.
 */
export function SeededMessages({
  components,
  ...props
}: Omit<SeededRuntimeProps, "children"> & { components: PartComponents }) {
  return (
    <SeededRuntime {...props}>
      <ThreadPrimitive.Root className="flex flex-col gap-4">
        <ThreadPrimitive.Messages>
          {() => <SeededMessage components={components} />}
        </ThreadPrimitive.Messages>
      </ThreadPrimitive.Root>
    </SeededRuntime>
  );
}
