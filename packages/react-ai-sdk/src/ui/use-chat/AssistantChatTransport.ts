import type {
  AssistantRuntime,
  ThreadListItemRuntime,
} from "@assistant-ui/core";
import {
  DefaultChatTransport,
  type HttpChatTransportInitOptions,
  type UIMessage,
} from "ai";
import { toToolsJSONSchema } from "assistant-stream";
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
  };

export class AssistantChatTransport<
  UI_MESSAGE extends UIMessage,
> extends DefaultChatTransport<UI_MESSAGE> {
  private runtime: AssistantRuntime | undefined;
  private getThreadListItem:
    | (() => InitializableThreadListItem | undefined)
    | undefined;
  private readonly resumable: AssistantChatResumableOptions | undefined;

  constructor(initOptions?: AssistantChatTransportInitOptions<UI_MESSAGE>) {
    const { resumable, ...rest } = initOptions ?? {};
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

        const optionsEx = {
          ...options,
          body: {
            callSettings: context?.callSettings,
            system: context?.system,
            config: context?.config,
            tools: toToolsJSONSchema(context?.tools ?? {}),
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

  getResumableAdapter(): AssistantChatResumableOptions | undefined {
    return this.resumable;
  }

  __internal_setGetThreadListItem(
    getter: () => InitializableThreadListItem | undefined,
  ) {
    this.getThreadListItem = getter;
  }
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
