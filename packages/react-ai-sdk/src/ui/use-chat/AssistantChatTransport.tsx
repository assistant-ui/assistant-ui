import { AssistantRuntime, Tool } from "@assistant-ui/react";
import {
  DefaultChatTransport,
  HttpChatTransportInitOptions,
  JSONSchema7,
  UIMessage,
} from "ai";
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
  constructor(initOptions?: HttpChatTransportInitOptions<UI_MESSAGE>) {
    super({
      ...initOptions,
      prepareSendMessagesRequest: async (options) => {
        const context = this.runtime?.thread.getModelContext();

        const optionsEx = {
          ...options,
          body: {
            callSettings: context?.callSettings,
            system: context?.system,
            tools: toAISDKTools(getEnabledTools(context?.tools ?? {})),
            ...options?.body,
          },
        };
        const preparedRequest =
          await initOptions?.prepareSendMessagesRequest?.(optionsEx);

        return {
          ...preparedRequest,
          body: preparedRequest?.body ?? {
            ...optionsEx.body,
            id: options.id,
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
}
