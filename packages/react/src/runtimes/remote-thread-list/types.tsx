import { ComponentType, PropsWithChildren } from "react";
import { AssistantRuntime } from "../../api";
import { Unsubscribe } from "../../types";
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

export type RemoteThreadListSubscriber = {
  onInitialize: (
    threadId: string,
    begin: () => Promise<RemoteThreadInitializeResponse>,
  ) => void;
  onGenerateTitle: (
    threadId: string,
    begin: () => Promise<AssistantStream>,
  ) => void;
};

export type RemoteThreadListAdapter = {
  runtimeHook: () => AssistantRuntime;

  list(): Promise<RemoteThreadListResponse>;

  rename(remoteId: string, newTitle: string): Promise<void>;
  archive(remoteId: string): Promise<void>;
  unarchive(remoteId: string): Promise<void>;
  delete(remoteId: string): Promise<void>;

  subscribe(subscriber: RemoteThreadListSubscriber): Unsubscribe;

  unstable_Provider?: ComponentType<PropsWithChildren>;
};
