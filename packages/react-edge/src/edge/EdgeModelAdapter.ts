import { toCoreMessages } from "../converters/toCoreMessages";
import { toLanguageModelTools } from "../converters/toLanguageModelTools";
import { EdgeRuntimeRequestOptions } from "./EdgeRuntimeRequestOptions";
import { toLanguageModelMessages } from "../converters";
import {
  ChatModelAdapter,
  ChatModelRunOptions,
  ThreadMessage,
  Tool,
  unstable_toolResultStream,
} from "@assistant-ui/react";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { JSONSchema7 } from "json-schema";
import {
  AssistantMessageAccumulator,
  DataStreamDecoder,
} from "assistant-stream";
import { asAsyncIterableStream } from "assistant-stream/utils";

type HeadersValue = Record<string, string> | Headers;

export type EdgeModelAdapterOptions = {
  api: string;

  // experimental_prepareRequestBody?: (options: {
  //   id: string;
  //   messages: UIMessage[];
  //   requestData?: JSONValue;
  //   requestBody?: object;
  // }) => unknown;

  // onToolCall?: ({
  //   toolCall,
  // }: {
  //   toolCall: UIMessageToolInvocation;
  // }) => void | Promise<unknown> | unknown;

  /**
   * Callback function to be called when the API response is received.
   */
  onResponse?: (response: Response) => void | Promise<void>;
  /**
   * Optional callback function that is called when the assistant message is finished streaming.
   */
  onFinish?: (message: ThreadMessage) => void;
  /**
   * Callback function to be called when an error is encountered.
   */
  onError?: (error: Error) => void;

  credentials?: RequestCredentials;

  /**
   * Headers to be sent with the request.
   * Can be a static headers object or a function that returns a Promise of headers.
   */
  headers?: HeadersValue | (() => Promise<HeadersValue>);

  body?: object;

  /**
   * @deprecated Renamed to `sendExtraMessageFields`.
   */
  unstable_sendMessageIds?: boolean;

  /**
   * When enabled, the adapter will not strip `id` from messages in the messages array.
   */
  sendExtraMessageFields?: boolean;

  /**
   * When enabled, the adapter will send messages in the format expected by the Vercel AI SDK Core.
   * This feature will be removed in the future in favor of a better solution.
   *
   * `v2` sends frontend tools in a format that can be directly passed to `stremaText`
   */
  unstable_AISDKInterop?: boolean | "v2" | undefined;
};

const toAISDKTools = (tools: Record<string, Tool<any, any>>) => {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description ? { description: tool.description } : undefined),
        parameters: (tool.parameters instanceof z.ZodType
          ? zodToJsonSchema(tool.parameters)
          : tool.parameters) as JSONSchema7,
      },
    ]),
  );
};

export class EdgeModelAdapter implements ChatModelAdapter {
  constructor(private options: EdgeModelAdapterOptions) {}

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

    const headers = new Headers(headersValue);
    headers.set("Content-Type", "application/json");

    const result = await fetch(this.options.api, {
      method: "POST",
      headers,
      credentials: this.options.credentials ?? "same-origin",
      body: JSON.stringify({
        system: context.system,
        messages: this.options.unstable_AISDKInterop
          ? (toLanguageModelMessages(messages, {
              unstable_includeId:
                this.options.unstable_sendMessageIds ||
                this.options.sendExtraMessageFields,
            }) as EdgeRuntimeRequestOptions["messages"]) // TODO figure out a better way to do this
          : toCoreMessages(messages, {
              unstable_includeId:
                this.options.unstable_sendMessageIds ||
                this.options.sendExtraMessageFields,
            }),
        tools: context.tools
          ? this.options.unstable_AISDKInterop === "v2"
            ? (toAISDKTools(context.tools) as any)
            : toLanguageModelTools(context.tools)
          : [],
        unstable_assistantMessageId,
        runConfig,
        ...context.callSettings,
        ...context.config,

        ...this.options.body,
      } satisfies EdgeRuntimeRequestOptions),
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
