"use client";

import type { AssistantRuntime, ThreadMessage } from "@assistant-ui/core";
import {
  splitLocalRuntimeOptions,
  useLocalRuntime,
  type LocalRuntimeOptions,
} from "@assistant-ui/core/react";
import { DataStreamRuntimeAdapter } from "./dataStreamRuntimeAdapter";
import type { DataStreamProtocol } from "./protocol";

type HeadersValue = Record<string, string> | Headers;

export type DataStreamRuntimeBodyOptions = {
  threadId?: string;
};

export type { DataStreamProtocol } from "./protocol";

export type UseDataStreamRuntimeOptions = {
  api: string;
  /** Defaults to response-header detection, then "ui-message-stream". */
  protocol?: DataStreamProtocol;
  /** Callback for data-* parts (ui-message-stream only). */
  onData?: (data: {
    type: string;
    name: string;
    data: unknown;
    transient?: boolean;
  }) => void;
  onResponse?: (response: Response) => void | Promise<void>;
  onFinish?: (message: ThreadMessage) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  credentials?: RequestCredentials;
  headers?: HeadersValue | (() => Promise<HeadersValue>);
  /** Extra request body fields; a callback receives the active remote thread id. */
  body?:
    | object
    | ((options: DataStreamRuntimeBodyOptions) => Promise<object | undefined>);
  sendExtraMessageFields?: boolean;
} & LocalRuntimeOptions;

export const useDataStreamRuntime = (
  options: UseDataStreamRuntimeOptions,
): AssistantRuntime => {
  const { localRuntimeOptions, otherOptions } =
    splitLocalRuntimeOptions(options);

  return useLocalRuntime(
    new DataStreamRuntimeAdapter(otherOptions),
    localRuntimeOptions,
  );
};
