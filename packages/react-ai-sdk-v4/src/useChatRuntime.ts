"use client";

import { toLanguageModelMessages } from "./converters";
import {
  AssistantRuntime,
  ChatModelAdapter,
  ChatModelRunOptions,
  INTERNAL,
  LocalRuntimeOptions,
  ThreadMessage,
  Tool,
  useLocalRuntime,
} from "@assistant-ui/react";
import { z } from "zod";
import { JSONSchema7 } from "json-schema";
import {
  AssistantMessageAccumulator,
  DataStreamDecoder,
  unstable_toolResultStream,
} from "assistant-stream";
import { asAsyncIterableStream } from "assistant-stream/utils";

const { splitLocalRuntimeOptions } = INTERNAL;

type HeadersValue = Record<string, string> | Headers;

export type UseChatRuntimeOptions = {
  api: string;
  onResponse?: (response: Response) => void | Promise<void>;
  onFinish?: (message: ThreadMessage) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
  credentials?: RequestCredentials;
  headers?: HeadersValue | (() => Promise<HeadersValue>);
  body?: object;
  sendExtraMessageFields?: boolean;
} & LocalRuntimeOptions;

type ChatRuntimeRequestOptions = {
  messages: any[];
  tools: any;
  system?: string | undefined;
  runConfig?: any;
  unstable_assistantMessageId?: string;
  state?: any;
};

const toAISDKTools = (tools: Record<string, Tool>) => {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description ? { description: tool.description } : undefined),
        parameters: (tool.parameters instanceof z.ZodType
          ? z.toJSONSchema(tool.parameters)
          : tool.parameters) as JSONSchema7,
      },
    ]),
  );
};

const getEnabledTools = (tools: Record<string, Tool>) => {
  return Object.fromEntries(
    Object.entries(tools).filter(
      ([, tool]) => !tool.disabled && tool.type !== "backend",
    ),
  );
};

class ChatRuntimeAdapter implements ChatModelAdapter {
  constructor(
    private options: Omit<UseChatRuntimeOptions, keyof LocalRuntimeOptions>,
  ) {}

  async *run({
    messages,
    runConfig,
    abortSignal,
    context,
    unstable_assistantMessageId,
    unstable_getMessage,
  }: ChatModelRunOptions) {
    const headersValue =
      typeof this.options.headers === "function"
        ? await this.options.headers()
        : this.options.headers;

    abortSignal.addEventListener(
      "abort",
      () => {
        if (!abortSignal.reason?.detach) this.options.onCancel?.();
      },
      { once: true },
    );

    const headers = new Headers(headersValue);
    headers.set("Content-Type", "application/json");

    const result = await fetch(this.options.api, {
      method: "POST",
      headers,
      credentials: this.options.credentials ?? "same-origin",
      body: JSON.stringify({
        system: context.system,
        messages: toLanguageModelMessages(messages, {
          unstable_includeId: this.options.sendExtraMessageFields,
        }) as ChatRuntimeRequestOptions["messages"],
        tools: toAISDKTools(
          getEnabledTools(context.tools ?? {}),
        ) as unknown as ChatRuntimeRequestOptions["tools"],
        ...(unstable_assistantMessageId ? { unstable_assistantMessageId } : {}),
        runConfig,
        state: unstable_getMessage().metadata.unstable_state || undefined,
        ...context.callSettings,
        ...context.config,
        ...this.options.body,
      } satisfies ChatRuntimeRequestOptions),
      signal: abortSignal,
    });

    await this.options.onResponse?.(result);

    try {
      if (!result.ok) {
        throw new Error(`Status ${result.status}: ${await result.text()}`);
      }
      if (!result.body) {
        throw new Error("Response body is null");
      }

      const stream = result.body
        .pipeThrough(new DataStreamDecoder())
        .pipeThrough(unstable_toolResultStream(context.tools, abortSignal))
        .pipeThrough(new AssistantMessageAccumulator());

      yield* asAsyncIterableStream(stream);

      this.options.onFinish?.(unstable_getMessage());
    } catch (error: unknown) {
      this.options.onError?.(error as Error);
      throw error;
    }
  }
}

export const useChatRuntime = (
  options: UseChatRuntimeOptions,
): AssistantRuntime => {
  const { localRuntimeOptions, otherOptions } =
    splitLocalRuntimeOptions(options);

  return useLocalRuntime(
    new ChatRuntimeAdapter(otherOptions),
    localRuntimeOptions,
  );
};
