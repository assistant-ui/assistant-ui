import type { AssistantRuntime, Tool } from "@assistant-ui/react";
import {
  DefaultChatTransport,
  type HttpChatTransportInitOptions,
  type JSONSchema7,
  type UIMessage,
} from "ai";
import type { RefObject } from "react";
import z from "zod";

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

export class AssistantChatTransport<
  UI_MESSAGE extends UIMessage,
> extends DefaultChatTransport<UI_MESSAGE> {
  private runtime: AssistantRuntime | undefined;
  private dynamicBodyRef?: RefObject<object | undefined>;

  constructor(initOptions?: HttpChatTransportInitOptions<UI_MESSAGE>) {
    const { body: _initBody, ...restInitOptions } = initOptions ?? {};

    super({
      ...restInitOptions,
      prepareSendMessagesRequest: async (options) => {
        const context = this.runtime?.thread.getModelContext();
        const id =
          (await this.runtime?.threads.mainItem.initialize())?.remoteId ??
          options.id;

        const dynamicBody = this.dynamicBodyRef?.current ?? _initBody;

        const optionsEx = {
          ...options,
          body: {
            callSettings: context?.callSettings,
            system: context?.system,
            tools: toAISDKTools(getEnabledTools(context?.tools ?? {})),
            ...options?.body,
            ...dynamicBody,
          },
        };
        const preparedRequest =
          await restInitOptions?.prepareSendMessagesRequest?.(optionsEx);

        return {
          ...preparedRequest,
          body: preparedRequest?.body ?? {
            ...optionsEx.body,
            id,
            messages: options.messages,
            trigger: options.trigger,
            messageId: options.messageId,
          },
        };
      },
    });
  }

  setRuntime(runtime: AssistantRuntime) {
    this.runtime = runtime;
  }

  /**
   * Set a ref that will be read dynamically on each request.
   * This allows the body to be updated without recreating the transport.
   * @internal
   */
  __internal_setDynamicBodyRef(ref: RefObject<object | undefined>) {
    this.dynamicBodyRef = ref;
  }
}
