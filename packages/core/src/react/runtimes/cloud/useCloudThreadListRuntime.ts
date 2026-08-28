"use client";

import type { AssistantCloud } from "assistant-cloud";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import { useRemoteThreadListRuntime } from "../useRemoteThreadListRuntime";
import { useCloudThreadListAdapter } from "./useCloudThreadListAdapter";

type ThreadData = {
  externalId: string;
};

type CloudThreadListAdapter = {
  cloud: AssistantCloud;

  runtimeHook: () => AssistantRuntime;

  create?(): Promise<ThreadData>;
  delete?(threadId: string): Promise<void>;
};

export function useCloudThreadListRuntime({
  runtimeHook,
  ...adapterOptions
}: CloudThreadListAdapter) {
  const adapter = useCloudThreadListAdapter(adapterOptions);
  return useRemoteThreadListRuntime({
    runtimeHook,
    adapter,
    allowNesting: true,
  });
}
