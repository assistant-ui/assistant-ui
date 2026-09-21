import type { ChatModelAdapter, ChatModelRunOptions } from "@assistant-ui/core";
import type { LocalRuntimeOptions } from "@assistant-ui/core/react";
import { invokeUserCallback } from "@assistant-ui/core/internal";
import {
  AssistantMessageAccumulator,
  DataStreamDecoder,
  toToolsJSONSchema,
  UIMessageStreamDecoder,
  unstable_toolResultStream,
} from "assistant-stream";
import { asAsyncIterableStream } from "assistant-stream/utils";
import { toLanguageModelMessages } from "./converters/toLanguageModelMessages";
import { resolveDataStreamProtocol } from "./protocol";
import type { UseDataStreamRuntimeOptions } from "./useDataStreamRuntime";

type HeadersValue = Record<string, string> | Headers;

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

type DataStreamRequestBodyBuilder = (
  options: ChatModelRunOptions,
) => object | Promise<object>;

let didWarnProtocolFallback = false;

export class DataStreamRuntimeAdapter implements ChatModelAdapter {
  private options: Omit<UseDataStreamRuntimeOptions, keyof LocalRuntimeOptions>;
  private buildRequestBody: DataStreamRequestBodyBuilder;

  constructor(
    options: Omit<UseDataStreamRuntimeOptions, keyof LocalRuntimeOptions>,
    buildRequestBody?: DataStreamRequestBodyBuilder,
  ) {
    this.options = options;
    this.buildRequestBody =
      buildRequestBody ??
      ((runOptions) => this.buildDefaultRequestBody(runOptions));
  }

  private buildDefaultRequestBody(options: ChatModelRunOptions) {
    if (typeof this.options.body === "function") {
      return this.options
        .body()
        .then((bodyValue: object | undefined) =>
          this.createDefaultRequestBody(options, bodyValue),
        );
    }

    return this.createDefaultRequestBody(options, this.options.body);
  }

  private createDefaultRequestBody(
    {
      messages,
      runConfig,
      context,
      unstable_assistantMessageId,
      unstable_threadId,
      unstable_parentId,
      unstable_getMessage,
    }: ChatModelRunOptions,
    bodyValue: object | undefined,
  ): object {
    return {
      system: context.system,
      messages: toLanguageModelMessages([...messages, unstable_getMessage()], {
        unstable_includeId: this.options.sendExtraMessageFields,
      }) as DataStreamRuntimeRequestOptions["messages"],
      tools: toToolsJSONSchema(
        context.tools ?? {},
      ) as unknown as DataStreamRuntimeRequestOptions["tools"],
      ...(unstable_assistantMessageId ? { unstable_assistantMessageId } : {}),
      ...(unstable_threadId ? { threadId: unstable_threadId } : {}),
      ...(unstable_parentId !== undefined
        ? { parentId: unstable_parentId }
        : {}),
      runConfig,
      state: unstable_getMessage().metadata.unstable_state ?? undefined,
      ...context.callSettings,
      ...context.config,
      ...(bodyValue ?? {}),
    } satisfies DataStreamRuntimeRequestOptions;
  }

  async *run({ abortSignal, context, ...runOptions }: ChatModelRunOptions) {
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

      const headers = new Headers(headersValue as HeadersValue);
      headers.set("Content-Type", "application/json");
      const requestBody = this.buildRequestBody({
        ...runOptions,
        abortSignal,
        context,
      });
      const serializedBody =
        requestBody instanceof Promise
          ? JSON.stringify(await requestBody)
          : JSON.stringify(requestBody);

      result = await fetch(this.options.api, {
        method: "POST",
        headers,
        credentials: this.options.credentials ?? "same-origin",
        body: serializedBody,
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
        runOptions.unstable_getMessage(),
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
