import { AssistantRuntime, ResumableAdapter, Tool } from "@assistant-ui/react";
import {
  DefaultChatTransport,
  HttpChatTransportInitOptions,
  JSONSchema7,
  UIMessage,
} from "ai";
import z from "zod";

export type ChatResumableAdapter = ResumableAdapter & {
  resumeApi?: string | ((streamId: string) => string);
};

export type ResumableState<UI_MESSAGE extends UIMessage = UIMessage> = {
  streamId: string;
  messages: UI_MESSAGE[];
} | null;

function toAISDKTools(
  tools: Record<string, Tool>,
): Record<string, { description?: string; parameters: JSONSchema7 }> {
  return Object.fromEntries(
    Object.entries(tools).map(([name, tool]) => [
      name,
      {
        ...(tool.description && { description: tool.description }),
        parameters: (tool.parameters instanceof z.ZodType
          ? z.toJSONSchema(tool.parameters)
          : tool.parameters) as JSONSchema7,
      },
    ]),
  );
}

function getEnabledTools(tools: Record<string, Tool>): Record<string, Tool> {
  return Object.fromEntries(
    Object.entries(tools).filter(
      ([, tool]) => !tool.disabled && tool.type !== "backend",
    ),
  );
}

function getResumeUrl(
  resumeApiOption: string | ((streamId: string) => string) | undefined,
  streamId: string,
): string | null {
  if (!resumeApiOption) return null;
  if (typeof resumeApiOption === "function") {
    return resumeApiOption(streamId);
  }
  return resumeApiOption;
}

function createClearStorageTransform(
  onFlush: () => void,
): TransformStream<Uint8Array, Uint8Array> {
  return new TransformStream({
    transform(chunk, controller) {
      controller.enqueue(chunk);
    },
    flush: onFlush,
  });
}

export type AssistantChatTransportOptions<
  UI_MESSAGE extends UIMessage = UIMessage,
> = HttpChatTransportInitOptions<UI_MESSAGE> & {
  resumable?: ChatResumableAdapter;
};

export class AssistantChatTransport<
  UI_MESSAGE extends UIMessage,
> extends DefaultChatTransport<UI_MESSAGE> {
  private runtime: AssistantRuntime | undefined;
  private pendingResume: ResumableState<UI_MESSAGE> = null;

  private _resumableAdapter: ChatResumableAdapter | undefined;

  constructor(initOptions?: AssistantChatTransportOptions<UI_MESSAGE>) {
    const originalFetch = initOptions?.fetch;
    const resumableAdapter = initOptions?.resumable;

    super({
      ...initOptions,
      fetch: async (url, fetchOptions) => {
        const storage = resumableAdapter?.storage;
        const fetchFn = originalFetch ?? fetch;

        if (this.pendingResume && storage) {
          const { streamId } = this.pendingResume;
          const resumeUrl = getResumeUrl(resumableAdapter?.resumeApi, streamId);

          if (!resumeUrl) {
            throw new Error(
              "resumeApi is required when resuming. Provide it in the resumable adapter.",
            );
          }

          const response = await fetchFn(resumeUrl, {
            method: "GET",
            ...(fetchOptions?.headers && { headers: fetchOptions.headers }),
            ...(fetchOptions?.signal && { signal: fetchOptions.signal }),
          });

          if (!response.ok) {
            throw new Error(`Resume failed: ${response.status}`);
          }

          this.pendingResume = null;
          resumableAdapter?.onResumingChange?.(false);

          if (response.body) {
            const transformStream = createClearStorageTransform(() =>
              storage.clearAll(),
            );
            return new Response(response.body.pipeThrough(transformStream), {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
          }

          return response;
        }

        if (storage && fetchOptions?.body) {
          try {
            const body = JSON.parse(fetchOptions.body as string);
            if (body.messages) {
              storage.setState(body.messages);
            }
          } catch {
            // Ignore JSON parse errors
          }
        }

        const response = await fetchFn(url, fetchOptions);

        if (storage) {
          const streamId = response.headers.get("X-Stream-Id");
          if (streamId) {
            storage.setStreamId(streamId);
          }
        }

        if (response.body && storage) {
          const transformStream = createClearStorageTransform(() =>
            storage.clearAll(),
          );
          return new Response(response.body.pipeThrough(transformStream), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        }

        return response;
      },
      prepareSendMessagesRequest: async (options) => {
        const context = this.runtime?.thread.getModelContext();
        const id =
          (await this.runtime?.threads.mainItem.initialize())?.remoteId ??
          options.id;

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
            id,
            messages: options.messages,
            trigger: options.trigger,
            messageId: options.messageId,
            metadata: options.requestMetadata,
          },
        };
      },
    });

    this._resumableAdapter = resumableAdapter;
  }

  setRuntime(runtime: AssistantRuntime): void {
    this.runtime = runtime;
  }

  getResumableAdapter(): ChatResumableAdapter | undefined {
    return this._resumableAdapter;
  }

  setPendingResume(state: ResumableState<UI_MESSAGE>): void {
    this.pendingResume = state;
  }
}
