import type { AssistantStream, AssistantStreamChunk } from "assistant-stream";
import type {
  RemoteThreadInitializeResponse,
  RemoteThreadListAdapter,
  RemoteThreadListResponse,
  RemoteThreadMetadata,
} from "../types";

export class InMemoryThreadListAdapter implements RemoteThreadListAdapter {
  private readonly threads = new Map<string, RemoteThreadMetadata>();

  list(): Promise<RemoteThreadListResponse> {
    return Promise.resolve({
      threads: [...this.threads.values()].reverse(),
    });
  }

  rename(remoteId: string, newTitle: string): Promise<void> {
    const thread = this.threads.get(remoteId);
    if (thread) this.threads.set(remoteId, { ...thread, title: newTitle });
    return Promise.resolve();
  }

  updateCustom(
    remoteId: string,
    custom: Record<string, unknown> | undefined,
  ): Promise<void> {
    const thread = this.threads.get(remoteId);
    if (thread) this.threads.set(remoteId, { ...thread, custom });
    return Promise.resolve();
  }

  archive(remoteId: string): Promise<void> {
    const thread = this.threads.get(remoteId);
    if (thread && thread.status !== "archived") {
      this.threads.delete(remoteId);
      this.threads.set(remoteId, { ...thread, status: "archived" });
    }
    return Promise.resolve();
  }

  unarchive(remoteId: string): Promise<void> {
    const thread = this.threads.get(remoteId);
    if (thread && thread.status !== "regular") {
      this.threads.delete(remoteId);
      this.threads.set(remoteId, { ...thread, status: "regular" });
    }
    return Promise.resolve();
  }

  delete(remoteId: string): Promise<void> {
    this.threads.delete(remoteId);
    return Promise.resolve();
  }

  initialize(threadId: string): Promise<RemoteThreadInitializeResponse> {
    return Promise.resolve(this.register(threadId));
  }

  /** @internal */
  register(
    threadId: string,
    externalId?: string | undefined,
  ): RemoteThreadInitializeResponse {
    const current = this.threads.get(threadId);
    const thread = current
      ? externalId === undefined || current.externalId === externalId
        ? current
        : { ...current, externalId }
      : { status: "regular" as const, remoteId: threadId, externalId };
    this.threads.set(threadId, thread);
    return { remoteId: threadId, externalId: thread.externalId };
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
    const thread = this.threads.get(threadId);
    if (thread) return Promise.resolve(thread);
    return Promise.reject(
      new Error(`Thread "${threadId}" not found in in-memory thread list.`),
    );
  }
}
