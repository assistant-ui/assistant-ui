"use client";

import type { VercelRSCAdapter } from "./VercelRSCAdapter";
import {
  ExternalStoreAdapter,
  ThreadMessageLike,
  useExternalStoreRuntime,
} from "@assistant-ui/react";
import { VercelRSCMessage } from "./VercelRSCMessage";

const vercelToThreadMessage = <T,>(
  converter: (message: T) => VercelRSCMessage,
  rawMessage: T,
): ThreadMessageLike => {
  const message = converter(rawMessage);

  return {
    id: message.id,
    role: message.role,
    content: [{ type: "ui", display: message.display }],
    createdAt: message.createdAt,
  };
};

export const useVercelRSCRuntime = <T extends WeakKey>(
  adapter: VercelRSCAdapter<T>,
) => {
  const onNew = adapter.onNew ?? adapter.append;
  if (!onNew)
    throw new Error("You must pass a onNew function to useVercelRSCRuntime");
  const eAdapter: ExternalStoreAdapter<any> = {
    isRunning: adapter.isRunning,
    messages: adapter.messages,
    onNew,
    onEdit: adapter.onEdit ?? adapter.edit,
    onReload: adapter.onReload ?? adapter.reload,
    onCopy: null,
    convertMessage: (m: T) =>
      vercelToThreadMessage(
        adapter.convertMessage ?? ((m) => m as VercelRSCMessage),
        m,
      ),
  };

  const runtime = useExternalStoreRuntime(eAdapter);
  return runtime;
};
