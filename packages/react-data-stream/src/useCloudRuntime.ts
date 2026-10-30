"use client";

import type { AssistantCloud } from "assistant-cloud";
import type { AssistantRuntime, ThreadMessage } from "@assistant-ui/core";
import {
  splitLocalRuntimeOptions,
  useLocalRuntime,
} from "@assistant-ui/core/react";
import type { UseDataStreamRuntimeOptions } from "./useDataStreamRuntime";
import { DataStreamRuntimeAdapter } from "./DataStreamRuntimeAdapter";

type UseCloudRuntimeOptions = Omit<
  UseDataStreamRuntimeOptions,
  "api" | "protocol" | "headers" | "body"
> & {
  cloud: AssistantCloud;
  assistantId: string;
};

// LocalRuntime answers a denial with an error result. The AI SDK turns a denied
// call into an execution-denied result only when the part carries no output.
const withoutDenialResults = (messages: readonly ThreadMessage[]) =>
  messages.map((message) =>
    message.role !== "assistant"
      ? message
      : {
          ...message,
          content: message.content.map((part) => {
            if (part.type !== "tool-call" || part.approval?.approved !== false)
              return part;
            const { result: _result, isError: _isError, ...call } = part;
            return call;
          }),
        },
  );

export const useCloudRuntime = (
  options: UseCloudRuntimeOptions,
): AssistantRuntime => {
  const { localRuntimeOptions, otherOptions } =
    splitLocalRuntimeOptions(options);
  const opts = options.cloud.runs.__internal_getAssistantOptions(
    options.assistantId,
  );

  return useLocalRuntime(
    new DataStreamRuntimeAdapter(
      {
        ...otherOptions,
        ...opts,
      },
      withoutDenialResults,
    ),
    localRuntimeOptions,
  );
};
