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

  rename(remoteId: string, newTitle: string): Promise<void>;
  archive(remoteId: string): Promise<void>;
  unarchive(remoteId: string): Promise<void>;
  delete(remoteId: string): Promise<void>;

  onInitialize(
    callback: (task: Promise<{ remoteId: string }>) => Promise<void>,
  ): Unsubscribe;
};
