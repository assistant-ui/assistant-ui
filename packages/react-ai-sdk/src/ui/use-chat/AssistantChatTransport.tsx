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
  constructor(options?: HttpChatTransportInitOptions<UI_MESSAGE>) {
    super({
      ...options,
      prepareSendMessagesRequest: async (opt) => {
        const res = await options?.prepareSendMessagesRequest?.(opt);
        if (!this.runtime) return res ?? { body: opt.body ?? {} };

        const context = this.runtime.thread.getModelContext();
        return {
          body: {
            system: context.system,
            tools: toAISDKTools(getEnabledTools(context.tools ?? {})),
            ...opt.body,
            ...res?.body,
          },
          ...res,
        };
      },
    });
  }

  setRuntime(runtime: AssistantRuntime) {
    this.runtime = runtime;
  }
}
