import type { ComponentType, PropsWithChildren } from "react";
import type { ThreadMessage } from "../../types/message";
import type { AssistantRuntime } from "../../runtime/api/assistant-runtime";
import type { AssistantStream } from "assistant-stream";

export type RemoteThreadInitializeResponse = {
  remoteId: string;
  externalId: string | undefined;
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
   * The Provider must render `children` on its first commit; deferring them
   * behind a loading state, a Suspense boundary, or a `useEffect`-gated render
   * is unsupported and leaves thread context unavailable to downstream
   * consumers. Load data inside an always-mounted child instead.
   */
  unstable_Provider?: ComponentType<PropsWithChildren> | undefined;
};

export type RemoteThreadListOptions = {
  runtimeHook: () => AssistantRuntime;
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
   * Called whenever the active thread's canonical (remote) ID changes, so the
   * value can be treated as a managed/controlled variable (e.g. synced to a
   * URL query param). Together with `threadId` this forms the controlled
   * pattern: `threadId` in, `onThreadIdChange` out.
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
