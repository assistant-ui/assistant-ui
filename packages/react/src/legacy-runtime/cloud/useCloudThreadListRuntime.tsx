"use client";

import { AssistantCloud } from "assistant-cloud";
import { AssistantRuntime } from "../runtime";
import { useRemoteThreadListRuntime } from "../runtime-cores/remote-thread-list/useRemoteThreadListRuntime";
import { useCloudThreadListAdapter } from "../runtime-cores/remote-thread-list/adapter/cloud";

type ThreadData = {
  externalId: string;
};

type CloudThreadListAdapter = {
  cloud: AssistantCloud;

  runtimeHook: () => AssistantRuntime;

  create?(): Promise<ThreadData>;
  delete?(threadId: string): Promise<void>;
};

export const useCloudThreadListRuntime = ({
  runtimeHook,
  ...adapterOptions
}: CloudThreadListAdapter) => {
  const adapter = useCloudThreadListAdapter(adapterOptions);
  const runtime = useRemoteThreadListRuntime({
    runtimeHook: runtimeHook,
    adapter,
  });

  return runtime;
};
