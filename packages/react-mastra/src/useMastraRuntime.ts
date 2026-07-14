"use client";

import { useRemoteThreadListRuntime } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import type { UIMessage } from "ai";
import { useMemo } from "react";
import { createMastraChatTransport } from "./createMastraChatTransport";
import { createMastraThreadListAdapter } from "./createMastraThreadListAdapter";
import type { UseMastraRuntimeOptions } from "./types";

export const useMastraRuntime = <UI_MESSAGE extends UIMessage = UIMessage>({
  client,
  agentId,
  resourceId,
  perPage,
  metadata,
  titleGenerator,
  threadId,
  onThreadIdChange,
  transport,
  transportOptions,
  ...chatOptions
}: UseMastraRuntimeOptions<UI_MESSAGE>) => {
  const adapter = useMemo(
    () =>
      createMastraThreadListAdapter({
        client,
        agentId,
        resourceId,
        perPage,
        metadata,
        titleGenerator,
      }),
    [client, agentId, resourceId, perPage, metadata, titleGenerator],
  );
  const defaultTransport = useMemo(
    () =>
      createMastraChatTransport<UI_MESSAGE>({
        api: "/api/chat",
        ...transportOptions,
        resourceId,
      }),
    [resourceId, transportOptions],
  );

  return useRemoteThreadListRuntime({
    runtimeHook: function MastraRuntimeHook() {
      return useChatRuntime<UI_MESSAGE>({
        ...chatOptions,
        transport: transport ?? defaultTransport,
      });
    },
    adapter,
    threadId,
    onThreadIdChange,
  });
};
