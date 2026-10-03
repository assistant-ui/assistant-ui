import type { AssistantStream, AssistantStreamChunk } from "assistant-stream";
import type {
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
} from "../types";

const threadsByAdapter = new WeakMap<
  InMemoryThreadListAdapter,
  Map<string, RemoteThreadMetadata>
>();

const getThreads = (adapter: InMemoryThreadListAdapter) => {
  let threads = threadsByAdapter.get(adapter);
  if (!threads) {
    threads = new Map();
    threadsByAdapter.set(adapter, threads);
  }
  return threads;
};

export class InMemoryThreadListAdapter implements RemoteThreadListAdapter {
  list(): Promise<RemoteThreadListResponse> {
    return Promise.resolve({
      threads: [...getThreads(this).values()],
    });
  }

  /** @internal */
  rename(remoteId: string, newTitle: string): Promise<void>;
  rename(): Promise<void>;
  rename(...args: [] | [remoteId: string, newTitle: string]): Promise<void> {
    if (args.length === 0) return Promise.resolve();
    const [remoteId, newTitle] = args;
    const threads = getThreads(this);
    const thread = threads.get(remoteId);
    if (thread) threads.set(remoteId, { ...thread, title: newTitle });
    return Promise.resolve();
  }

  /** @internal */
  updateCustom(
    remoteId: string,
    custom: Record<string, unknown> | undefined,
  ): Promise<void>;
  updateCustom(): Promise<void>;
  updateCustom(
    ...args:
      | []
      | [remoteId: string, custom: Record<string, unknown> | undefined]
  ): Promise<void> {
    if (args.length === 0) return Promise.resolve();
    const [remoteId, custom] = args;
    const threads = getThreads(this);
    const thread = threads.get(remoteId);
    if (thread) threads.set(remoteId, { ...thread, custom });
    return Promise.resolve();
  }

  /** @internal */
  archive(remoteId: string): Promise<void>;
  archive(): Promise<void>;
  archive(...args: [] | [remoteId: string]): Promise<void> {
    if (args.length === 0) return Promise.resolve();
    const [remoteId] = args;
    const threads = getThreads(this);
    const thread = threads.get(remoteId);
    if (thread) threads.set(remoteId, { ...thread, status: "archived" });
    return Promise.resolve();
  }

  /** @internal */
  unarchive(remoteId: string): Promise<void>;
  unarchive(): Promise<void>;
  unarchive(...args: [] | [remoteId: string]): Promise<void> {
    if (args.length === 0) return Promise.resolve();
    const [remoteId] = args;
    const threads = getThreads(this);
    const thread = threads.get(remoteId);
    if (thread) threads.set(remoteId, { ...thread, status: "regular" });
    return Promise.resolve();
  }

  /** @internal */
  delete(remoteId: string): Promise<void>;
  delete(): Promise<void>;
  delete(...args: [] | [remoteId: string]): Promise<void> {
    if (args.length === 0) return Promise.resolve();
    const [remoteId] = args;
    getThreads(this).delete(remoteId);
    return Promise.resolve();
  }

  initialize(threadId: string): Promise<RemoteThreadInitializeResponse> {
    return Promise.resolve(initializeInMemoryThread(this, threadId));
  }

  generateTitle(): Promise<AssistantStream> {
    return Promise.resolve(
      new ReadableStream<AssistantStreamChunk>({
        start(controller) {
          controller.close();
        },
      }),
    );
  }

  fetch(threadId: string): Promise<RemoteThreadMetadata> {
    const thread = getThreads(this).get(threadId);
    if (thread) return Promise.resolve(thread);
    return Promise.reject(
      new Error(`Thread "${threadId}" not found in in-memory thread list.`),
    );
  }
}

/** @internal Registers a thread initialized by an in-memory adapter wrapper. */
export const initializeInMemoryThread = (
  adapter: InMemoryThreadListAdapter,
  threadId: string,
  externalId?: string | undefined,
): RemoteThreadInitializeResponse => {
  const threads = getThreads(adapter);
  const current = threads.get(threadId);
  const thread = current
    ? externalId === undefined || current.externalId === externalId
      ? current
      : { ...current, externalId }
    : { status: "regular" as const, remoteId: threadId, externalId };
  threads.set(threadId, thread);
  return { remoteId: threadId, externalId: thread.externalId };
};
