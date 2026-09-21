import { toLanguageModelMessages } from "./converters/toLanguageModelMessages";
import { resolveDataStreamProtocol } from "./protocol";
import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ThreadMessage,
} from "@assistant-ui/core";
import { invokeUserCallback } from "@assistant-ui/core/internal";
import type { LocalRuntimeOptions } from "@assistant-ui/core/react";
import {
  AssistantMessageAccumulator,
  DataStreamDecoder,
  toToolsJSONSchema,
  UIMessageStreamDecoder,
  unstable_toolResultStream,
} from "assistant-stream";
import { asAsyncIterableStream } from "assistant-stream/utils";
import type { UseDataStreamRuntimeOptions } from "./useDataStreamRuntime";

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

type MessageSerializer = (messages: readonly ThreadMessage[]) => unknown[];

type DataStreamRuntimeAdapterOptions = Omit<
  UseDataStreamRuntimeOptions,
  keyof LocalRuntimeOptions
>;

type DataStreamRuntimeCallbackName =
  | "onFinish"
  | "onError"
  | "onCancel"
  | "onData";

const invokeRuntimeCallback = <TArgs extends readonly unknown[]>(
  name: DataStreamRuntimeCallbackName,
  callback: ((...args: TArgs) => unknown) | undefined,
  ...args: TArgs
): void => {
  void invokeUserCallback("react-data-stream", name, callback, ...args);
};

let didWarnProtocolFallback = false;

export class DataStreamRuntimeAdapter implements ChatModelAdapter {
  private options: DataStreamRuntimeAdapterOptions;
  private serializeMessages: MessageSerializer;

  constructor(
    options: DataStreamRuntimeAdapterOptions,
    serializeMessages?: MessageSerializer,
  ) {
    this.options = options;
    this.serializeMessages =
      serializeMessages ??
      ((messages) =>
        toLanguageModelMessages(messages, {
          unstable_includeId: options.sendExtraMessageFields,
        }));
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
          ? await this.options.body(
              unstable_threadId === undefined
                ? {}
                : { threadId: unstable_threadId },
            )
          : this.options.body;

      const headers = new Headers(headersValue);
      headers.set("Content-Type", "application/json");

      result = await fetch(this.options.api, {
        method: "POST",
        headers,
        credentials: this.options.credentials ?? "same-origin",
        body: JSON.stringify({
          system: context.system,
          messages: this.serializeMessages([
            ...messages,
            unstable_getMessage(),
          ]) as DataStreamRuntimeRequestOptions["messages"],
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
      void result.body?.cancel().catch(() => undefined);
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
      if (!(error instanceof Error && error.name === "AbortError")) {
        invokeRuntimeCallback(
          "onError",
          this.options.onError,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
      throw error;
    } finally {
      abortSignal.removeEventListener("abort", handleAbort);
    }
  }
}
