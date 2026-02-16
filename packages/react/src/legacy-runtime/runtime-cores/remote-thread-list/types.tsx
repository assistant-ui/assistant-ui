import type { ThreadMessage } from "@assistant-ui/core";
import { AssistantRuntime } from "../../runtime";
import { AssistantStream } from "assistant-stream";

export type RemoteThreadInitializeResponse = {
  remoteId: string;
  externalId: string | undefined;
};

export type RemoteThreadMetadata = {
  readonly status: "regular" | "archived";
  readonly remoteId: string;
  readonly externalId?: string | undefined;
  readonly title?: string | undefined;
};

export type RemoteThreadListResponse = {
  threads: RemoteThreadMetadata[];
};

export type RemoteThreadListAdapter = {
  list(): Promise<RemoteThreadListResponse>;

  rename(remoteId: string, newTitle: string): Promise<void>;
  archive(remoteId: string): Promise<void>;
  unarchive(remoteId: string): Promise<void>;
  delete(remoteId: string): Promise<void>;
  initialize(threadId: string): Promise<RemoteThreadInitializeResponse>;
  generateTitle(
    remoteId: string,
    unstable_messages: readonly ThreadMessage[],
  ): Promise<AssistantStream>;
  fetch(threadId: string): Promise<RemoteThreadMetadata>;

  unstable_Provider?: ((...args: any[]) => unknown) | undefined;
};

export type RemoteThreadListOptions = {
  runtimeHook: () => AssistantRuntime;
  adapter: RemoteThreadListAdapter;

  /**
   * When true, if this runtime is used inside another RemoteThreadListRuntime,
   * it becomes a no-op and simply calls the runtimeHook directly.
   * This allows wrapping runtimes that internally use RemoteThreadListRuntime.
   */
  allowNesting?: boolean | undefined;
};
