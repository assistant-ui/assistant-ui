import { AssistantRuntime } from "../../api";
import { Unsubscribe } from "../../types";

export type RemoteThreadMetadata = {
  readonly status: "regular" | "archived";
  readonly remoteId: string;
  readonly title?: string | undefined;
};

export type RemoteThreadListResponse = {
  threads: RemoteThreadMetadata[];
};

export type RemoteThreadListHook = () => AssistantRuntime;

export type RemoteThreadListAdapter = {
  runtimeHook: RemoteThreadListHook;

  list(): Promise<RemoteThreadListResponse>;

  rename(threadId: string, newName: string): Promise<void>;
  archive(threadId: string): Promise<void>;
  unarchive(threadId: string): Promise<void>;
  delete(threadId: string): Promise<void>;

  onInitialize(
    callback: (task: Promise<{ remoteId: string }>) => Promise<void>,
  ): Unsubscribe;
};
