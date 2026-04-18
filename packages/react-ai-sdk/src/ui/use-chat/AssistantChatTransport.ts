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

type InitializableThreadListItem = Pick<ThreadListItemRuntime, "initialize">;

export class AssistantChatTransport<
  UI_MESSAGE extends UIMessage,
> extends DefaultChatTransport<UI_MESSAGE> {
  private runtime: AssistantRuntime | undefined;
  private getThreadListItem:
    | (() => InitializableThreadListItem | undefined)
    | undefined;
  constructor(initOptions?: HttpChatTransportInitOptions<UI_MESSAGE>) {
    super({
      ...initOptions,
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
          await initOptions?.prepareSendMessagesRequest?.(optionsEx);

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
  }

  setRuntime(runtime: AssistantRuntime) {
    this.runtime = runtime;
  }

  __internal_setGetThreadListItem(
    getter: () => InitializableThreadListItem | undefined,
  ) {
    this.getThreadListItem = getter;
  }
}
