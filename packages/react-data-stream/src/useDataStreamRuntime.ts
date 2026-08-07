"use client";

import { toLanguageModelMessages } from "./converters/toLanguageModelMessages";
import { resolveDataStreamProtocol, type DataStreamProtocol } from "./protocol";
import type {
  AssistantRuntime,
  ChatModelAdapter,
  ChatModelRunOptions,
  ThreadMessage,
} from "@assistant-ui/core";
import {
  useLocalRuntime,
  splitLocalRuntimeOptions,
  type LocalRuntimeOptions,
} from "@assistant-ui/core/react";
import {
  AssistantMessageAccumulator,
  DataStreamDecoder,
  toToolsJSONSchema,
  UIMessageStreamDecoder,
  unstable_toolResultStream,
} from "assistant-stream";
import { asAsyncIterableStream } from "assistant-stream/utils";

type HeadersValue = Record<string, string> | Headers;

type DataStreamRuntimeCallbackName =
  | "onFinish"
  | "onError"
  | "onCancel"
  | "onData";

const reportCallbackError = (
  name: DataStreamRuntimeCallbackName,
  error: unknown,
) => {
  console.error(`[react-data-stream] ${name} callback threw an error`, error);
};

const invokeRuntimeCallback = <TArgs extends unknown[]>(
  name: DataStreamRuntimeCallbackName,
  callback: ((...args: TArgs) => void) | undefined,
  ...args: TArgs
) => {
  if (!callback) return;

  try {
    const result = callback(...args) as unknown;
    if (
      result !== null &&
      (typeof result === "object" || typeof result === "function") &&
      "then" in result &&
      typeof result.then === "function"
    ) {
      void Promise.resolve(result).catch((error) => {
        reportCallbackError(name, error);
      });
    }
  } catch (error) {
    reportCallbackError(name, error);
  }
};

export type { DataStreamProtocol } from "./protocol";

let didWarnProtocolFallback = false;

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
  body?: object | (() => Promise<object | undefined>);
  sendExtraMessageFields?: boolean;
} & LocalRuntimeOptions;

type DataStreamRuntimeRequestOptions = {
  messages: any[];
  tools: any;
  system?: string | undefined;
  runConfig?: any;
  unstable_assistantMessageId?: string;
  threadId?: string;
  parentId?: string | null;
  state?: any;
};

class DataStreamRuntimeAdapter implements ChatModelAdapter {
  private options: Omit<UseDataStreamRuntimeOptions, keyof LocalRuntimeOptions>;

  constructor(
    options: Omit<UseDataStreamRuntimeOptions, keyof LocalRuntimeOptions>,
  ) {
    this.options = options;
  }

  async *run({
    messages,
    runConfig,
    abortSignal,
    context,
    unstable_assistantMessageId,
    unstable_threadId,
    unstable_parentId,
    unstable_getMessage,
  }: ChatModelRunOptions) {
    const handleAbort = () => {
      if (!abortSignal.reason?.detach) {
        invokeRuntimeCallback("onCancel", this.options.onCancel);
      }
    };

    if (abortSignal.aborted) {
      handleAbort();
    } else {
      abortSignal.addEventListener("abort", handleAbort, { once: true });
    }

    let result: Response;
    try {
      const headersValue =
        typeof this.options.headers === "function"
          ? await this.options.headers()
          : this.options.headers;

      const bodyValue =
        typeof this.options.body === "function"
          ? await this.options.body()
          : this.options.body;

      const headers = new Headers(headersValue);
      headers.set("Content-Type", "application/json");

      result = await fetch(this.options.api, {
        method: "POST",
        headers,
        credentials: this.options.credentials ?? "same-origin",
        body: JSON.stringify({
          system: context.system,
          messages: toLanguageModelMessages(
            [...messages, unstable_getMessage()],
            { unstable_includeId: this.options.sendExtraMessageFields },
          ) as DataStreamRuntimeRequestOptions["messages"],
          tools: toToolsJSONSchema(
            context.tools ?? {},
          ) as unknown as DataStreamRuntimeRequestOptions["tools"],
          ...(unstable_assistantMessageId
            ? { unstable_assistantMessageId }
            : {}),
          ...(unstable_threadId ? { threadId: unstable_threadId } : {}),
          ...(unstable_parentId !== undefined
            ? { parentId: unstable_parentId }
            : {}),
          runConfig,
          state: unstable_getMessage().metadata.unstable_state ?? undefined,
          ...context.callSettings,
          ...context.config,
          ...(bodyValue ?? {}),
        } satisfies DataStreamRuntimeRequestOptions),
        signal: abortSignal,
      });
    } catch (error: unknown) {
      abortSignal.removeEventListener("abort", handleAbort);
      if (!(error instanceof Error && error.name === "AbortError")) {
        invokeRuntimeCallback(
          "onError",
          this.options.onError,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
      throw error;
    }

    try {
      await this.options.onResponse?.(result);
    } catch (error: unknown) {
      abortSignal.removeEventListener("abort", handleAbort);
      throw error;
    }

    try {
      if (!result.ok) {
        throw new Error(`Status ${result.status}: ${await result.text()}`);
      }
      if (!result.body) {
        throw new Error("Response body is null");
      }

      const { protocol, source } = resolveDataStreamProtocol(
        result.headers,
        this.options.protocol,
      );
      if (
        source === "fallback" &&
        process.env.NODE_ENV !== "production" &&
        !didWarnProtocolFallback
      ) {
        didWarnProtocolFallback = true;
        console.warn(
          '@assistant-ui/react-data-stream could not detect a stream protocol header; falling back to "ui-message-stream". Pass protocol explicitly or expose x-vercel-ai-data-stream / x-vercel-ai-ui-message-stream from the response.',
        );
      }
      const decoder =
        protocol === "ui-message-stream"
          ? new UIMessageStreamDecoder(
              this.options.onData
                ? {
                    onData: (data) => {
                      invokeRuntimeCallback(
                        "onData",
                        this.options.onData,
                        data,
                      );
                    },
                  }
                : {},
            )
          : new DataStreamDecoder();

      const stream = result.body
        .pipeThrough(decoder)
        .pipeThrough(
          unstable_toolResultStream(context.tools, abortSignal, () => {
            throw new Error(
              "Tool interrupt is not supported in data stream runtime",
            );
          }),
        )
        .pipeThrough(new AssistantMessageAccumulator());

      yield* asAsyncIterableStream(stream);

      invokeRuntimeCallback(
        "onFinish",
        this.options.onFinish,
        unstable_getMessage(),
      );
    } catch (error: unknown) {
      invokeRuntimeCallback("onError", this.options.onError, error as Error);
      throw error;
    } finally {
      abortSignal.removeEventListener("abort", handleAbort);
    }
  }
}

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
