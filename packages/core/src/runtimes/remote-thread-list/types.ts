import type { ThreadMessage } from "../../types/message";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { AssistantStream } from "assistant-stream";
import type { ThreadHistoryAdapter } from "../../adapters/thread-history";
import type { AttachmentAdapter } from "../../adapters/attachment";
import type { FeedbackAdapter } from "../../adapters/feedback";
import type { ModelContextProvider } from "../../model-context/types";

/* oxlint-disable typescript/no-explicit-any -- structural stand-in for ComponentType without depending on react types */
type RemoteThreadListProviderProps = { children?: any };

export type RemoteThreadListProviderComponent =
  | ((props: RemoteThreadListProviderProps) => any)
  | (new (props: RemoteThreadListProviderProps) => any);
/* oxlint-enable typescript/no-explicit-any */

export type RemoteThreadInitializeResponse = {
  remoteId: string;
  externalId?: string | undefined;
};

export type RemoteThreadMetadata = {
  readonly status: "regular" | "archived";
  readonly remoteId: string;
  readonly externalId?: string | undefined;
  readonly title?: string | undefined;
  readonly lastMessageAt?: Date | undefined;
  readonly custom?: Record<string, unknown> | undefined;
};

export type RemoteThreadListResponse = {
  threads: RemoteThreadMetadata[];
  nextCursor?: string | undefined;
};

export type RemoteThreadListPageOptions = {
  after?: string | undefined;
};

export type RuntimeAdapters = {
  modelContext?: ModelContextProvider | undefined;
  history?: ThreadHistoryAdapter | undefined;
  attachments?: AttachmentAdapter | undefined;
  feedback?: FeedbackAdapter | undefined;
};

export type RemoteThreadListAdapter = {
  list(params?: RemoteThreadListPageOptions): Promise<RemoteThreadListResponse>;

  rename(remoteId: string, newTitle: string): Promise<void>;
  updateCustom?(
    remoteId: string,
    custom: Record<string, unknown> | undefined,
  ): Promise<void>;
  archive(remoteId: string): Promise<void>;
  unarchive(remoteId: string): Promise<void>;
  delete(remoteId: string): Promise<void>;
  initialize(threadId: string): Promise<RemoteThreadInitializeResponse>;
  generateTitle(
    remoteId: string,
    unstable_messages: readonly ThreadMessage[],
  ): Promise<AssistantStream>;
  fetch(threadId: string): Promise<RemoteThreadMetadata>;

  /**
   * Optional React component wrapped around each active thread. Use it to
   * inject per-thread context such as a history or attachments adapter (see
   * `useCloudThreadListAdapter` for the canonical shape).
   *
   * `useRemoteThreadListRuntime` renders this component when present. If it
   * is omitted, that host synthesizes a `RuntimeAdapterProvider` from
   * `unstable_useAdapters`. The `RemoteThreadList` store entry ignores it;
   * expose `unstable_useAdapters` for that host.
   *
   * The Provider must render `children` on its first commit; deferring them
   * behind a loading state, a Suspense boundary, or a `useEffect`-gated render
   * is unsupported and leaves thread context unavailable to downstream
   * consumers. Load data inside an always-mounted child instead.
   */
  unstable_Provider?: RemoteThreadListProviderComponent | undefined;

  /**
   * Hook the `RemoteThreadList` store entry calls once per mounted thread
   * body (the main-thread slot by default; every started thread with
   * `backgroundThreads`), then provides to the `thread` factory. This is not
   * mounted per listed thread. `useRemoteThreadListRuntime` also calls it
   * when `unstable_Provider` is omitted. Resolve `threadListItem` lazily on
   * each adapter call; do not capture it at hook mount. The hook must keep a
   * stable hook count across adapter swaps; a different count throws.
   * Memoize the returned object.
   *
   * Per-thread history also requires the `thread` factory to be keyed by
   * thread id (`withKey(id, thread(...))`). History loaders such as
   * `useExternalHistory` run once per mount; an unkeyed factory keeps one
   * instance across switches and the next thread's messages never load.
   */
  unstable_useAdapters?: (() => RuntimeAdapters | null | undefined) | undefined;
};

export type RemoteThreadListOptions = {
  runtimeHook: () => AssistantRuntime;

  /**
   * The adapter reference should remain stable across renders. Replacing it reloads the list and drops cached threads that are not in the replacement page. In-flight mutations from the previous adapter are cancelled.
   */
  adapter: RemoteThreadListAdapter;

  /**
   * When provided, the runtime starts on this thread instead of creating a
   * new empty thread. Useful for URL-based routing (e.g. `/chat/[threadId]`)
   * where the initial thread is known at mount time.
   *
   * @deprecated Use `threadId` instead, which also reacts to subsequent changes.
   */
  initialThreadId?: string | undefined;

  /**
   * The current thread ID to display. When this value changes, the runtime
   * automatically switches to the specified thread. Set to `undefined` to
   * switch to a new thread.
   */
  threadId?: string | undefined;

  /**
   * Called whenever the runtime changes the active thread's canonical (remote)
   * ID, so the value can be treated as a managed/controlled variable (e.g.
   * synced to a URL query param). Changes initiated by the controlled
   * `threadId` option are not echoed back. Together these options form the
   * controlled pattern: `threadId` in, `onThreadIdChange` out.
   *
   * Only the settled remote ID is emitted: while a freshly created thread is
   * still optimistic (no remote ID yet) the value is `undefined`, and the real
   * ID is emitted once the thread is initialized. The transient local ID is
   * never surfaced.
   */
  onThreadIdChange?: ((threadId: string | undefined) => void) | undefined;

  /**
   * When true, if this runtime is used inside another RemoteThreadListRuntime,
   * it becomes a no-op and simply calls the runtimeHook directly.
   * This allows wrapping runtimes that internally use RemoteThreadListRuntime.
   */
  allowNesting?: boolean | undefined;
};
