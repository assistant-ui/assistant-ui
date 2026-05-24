import type {
  AssistantRuntime,
  ThreadListItemRuntime,
} from "@assistant-ui/core";
import {
  DefaultChatTransport,
  type HttpChatTransportInitOptions,
  type UIMessage,
} from "ai";
import {
  anthropicToolSearchAdapter,
  openaiToolSearchAdapter,
  genericFallbackAdapter,
  type ToolWireFormatAdapter,
} from "assistant-stream";
import type { AssistantClient } from "@assistant-ui/store";
import {
  RESUMABLE_STREAM_ID_HEADER,
  type AssistantChatResumableOptions,
} from "../resumable";

type InitializableThreadListItem = Pick<ThreadListItemRuntime, "initialize">;

const FINISH_MARKER = '"type":"finish"';
const FINISH_BUFFER_LIMIT = 4096;
const FINISH_BUFFER_TAIL = 1024;

export type AssistantChatTransportInitOptions<UI_MESSAGE extends UIMessage> =
  HttpChatTransportInitOptions<UI_MESSAGE> & {
    resumable?: AssistantChatResumableOptions;
    /**
     * Wire-format adapter for translating `(tools, deferredTools)` into
     * the provider's expected request shape. Pass a string shortcut, a
     * concrete adapter instance, or omit to default to Anthropic.
     */
    toolWireFormat?:
      | ToolWireFormatAdapter
      | "anthropic"
      | "openai"
      | "auto"
      | "generic";
    /**
     * Variant of Anthropic's Tool Search Tool when `toolWireFormat`
     * resolves to Anthropic. Defaults to `"bm25"`.
     */
    toolSearchVariant?: "bm25" | "regex";
  };

export class AssistantChatTransport<
  UI_MESSAGE extends UIMessage,
> extends DefaultChatTransport<UI_MESSAGE> {
  private runtime: AssistantRuntime | undefined;
  private aui: AssistantClient | undefined;
  private getThreadListItem:
    | (() => InitializableThreadListItem | undefined)
    | undefined;
  private readonly resumable: AssistantChatResumableOptions | undefined;

  constructor(initOptions?: AssistantChatTransportInitOptions<UI_MESSAGE>) {
    const {
      resumable,
      toolWireFormat,
      toolSearchVariant = "bm25",
      ...rest
    } = initOptions ?? {};
    // If the caller passed a concrete adapter instance, resolve once up-front.
    // For string shortcuts (including undefined / "auto"), resolve per-request
    // so provider auto-detection can read modelName from the live context.
    const staticAdapter =
      toolWireFormat && typeof toolWireFormat === "object"
        ? toolWireFormat
        : undefined;
    // Eagerly validate string shortcuts at construction time so typos fail fast.
    if (toolWireFormat && typeof toolWireFormat === "string") {
      resolveWireFormat(toolWireFormat, { toolSearchVariant });
    }
    const userFetch = rest.fetch;
    const userPrepareReconnect = rest.prepareReconnectToStreamRequest;

    super({
      ...rest,
      ...(resumable && {
        fetch: wrapFetchWithResumable(resumable, userFetch),
        prepareReconnectToStreamRequest: wrapPrepareReconnect(
          resumable,
          userPrepareReconnect,
        ),
      }),
      prepareSendMessagesRequest: async (options) => {
        const context = this.runtime?.thread.getModelContext();
        const threadListItem =
          this.getThreadListItem?.() ?? this.runtime?.threads.mainItem;
        const id = (await threadListItem?.initialize())?.remoteId ?? options.id;

        // Collect registered catalogs from the tap client scope (if available).
        const catalogScope = this.aui?.toolCatalogs.source
          ? this.aui.toolCatalogs()
          : undefined;
        const catalogs = catalogScope
          ? catalogScope.list().map((c) => ({ catalogId: c.catalogId }))
          : undefined;

        const modelName = context?.config?.modelName;
        const adapter =
          staticAdapter ??
          resolveWireFormat(
            toolWireFormat as
              | "anthropic"
              | "openai"
              | "auto"
              | "generic"
              | undefined,
            {
              toolSearchVariant,
              ...(modelName && { modelName }),
            },
          );
        const { tools, extraHeaders, extraBody } = adapter.format({
          tools: context?.tools,
          deferredTools: context?.deferredTools,
          ...(catalogs && { catalogs }),
        });
        const headers = extraHeaders
          ? { ...options?.headers, ...extraHeaders }
          : options?.headers;

        const optionsEx = {
          ...options,
          ...(headers && { headers }),
          body: {
            callSettings: context?.callSettings,
            system: context?.system,
            config: context?.config,
            tools,
            ...extraBody,
            ...options?.body,
          },
        };
        const preparedRequest =
          await rest.prepareSendMessagesRequest?.(optionsEx);

        return {
          ...preparedRequest,
          body: preparedRequest?.body ?? {
            ...optionsEx.body,
            id,
            messages: options.messages,
            trigger: options.trigger,
            messageId: options.messageId,
            metadata: options.requestMetadata,
          },
        };
      },
    });

    this.resumable = resumable;
  }

  setRuntime(runtime: AssistantRuntime) {
    this.runtime = runtime;
  }

  /**
   * Provides the tap client so the transport can read scopes such as
   * `toolCatalogs`. Called from `useChatRuntime` after the aui client is
   * available.
   */
  setAui(aui: AssistantClient) {
    this.aui = aui;
  }

  getResumableAdapter(): AssistantChatResumableOptions | undefined {
    return this.resumable;
  }

  __internal_setGetThreadListItem(
    getter: () => InitializableThreadListItem | undefined,
  ) {
    this.getThreadListItem = getter;
  }
}

function resolveWireFormat(
  input:
    | ToolWireFormatAdapter
    | "anthropic"
    | "openai"
    | "auto"
    | "generic"
    | undefined,
  options: { toolSearchVariant: "bm25" | "regex"; modelName?: string },
): ToolWireFormatAdapter {
  if (input && typeof input === "object") return input;
  switch (input) {
    case "auto":
    case undefined:
      return detectWireFormat(options.modelName, options.toolSearchVariant);
    case "anthropic":
      return anthropicToolSearchAdapter({ variant: options.toolSearchVariant });
    case "openai":
      return openaiToolSearchAdapter();
    case "generic":
      return genericFallbackAdapter({ adapterId: "react-ai-sdk" });
  }
}

function detectWireFormat(
  modelName: string | undefined,
  variant: "bm25" | "regex",
): ToolWireFormatAdapter {
  if (!modelName) return anthropicToolSearchAdapter({ variant });
  if (/^(claude|anthropic)/i.test(modelName))
    return anthropicToolSearchAdapter({ variant });
  if (/^(gpt|o[0-9]|openai)/i.test(modelName)) return openaiToolSearchAdapter();
  return anthropicToolSearchAdapter({ variant });
}

function wrapFetchWithResumable(
  resumable: AssistantChatResumableOptions,
  userFetch: HttpChatTransportInitOptions<UIMessage>["fetch"],
): NonNullable<HttpChatTransportInitOptions<UIMessage>["fetch"]> {
  const baseFetch: typeof globalThis.fetch = userFetch
    ? (input, init) => userFetch(input as RequestInfo | URL, init)
    : globalThis.fetch.bind(globalThis);

  return async (input, init) => {
    const res = await baseFetch(input, init);
    const id = res.headers.get(RESUMABLE_STREAM_ID_HEADER);
    if (id) resumable.storage.setStreamId(id);
    if (!res.body) return res;

    const detectFinish = resumable.isFinishEvent ?? defaultIsFinishEvent;
    // a single decoder is required so multi-byte sequences split across
    // chunks buffer via stream: true rather than getting dropped.
    const decoder = new TextDecoder();
    let accumulator = "";
    const tap = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        controller.enqueue(chunk);
        accumulator += decoder.decode(chunk, { stream: true });
        if (detectFinish(chunk, accumulator)) {
          resumable.storage.clear();
          accumulator = "";
        } else if (accumulator.length > FINISH_BUFFER_LIMIT) {
          accumulator = accumulator.slice(-FINISH_BUFFER_TAIL);
        }
      },
    });

    return new Response(res.body.pipeThrough(tap), {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
  };
}

function defaultIsFinishEvent(_chunk: Uint8Array, accumulator: string) {
  return accumulator.includes(FINISH_MARKER);
}

function wrapPrepareReconnect(
  resumable: AssistantChatResumableOptions,
  userPrepareReconnect: HttpChatTransportInitOptions<UIMessage>["prepareReconnectToStreamRequest"],
): NonNullable<
  HttpChatTransportInitOptions<UIMessage>["prepareReconnectToStreamRequest"]
> {
  return async (options) => {
    const streamId = resumable.storage.getStreamId();
    if (!streamId) {
      throw new Error(
        "AssistantChatTransport: no resumable stream id available; nothing to resume",
      );
    }
    const api =
      typeof resumable.resumeApi === "function"
        ? resumable.resumeApi(streamId)
        : resumable.resumeApi;
    const userPrepared = await userPrepareReconnect?.({ ...options, api });
    return {
      ...userPrepared,
      api: userPrepared?.api ?? api,
    };
  };
}
