"use client";

import { useMemo } from "react";
import {
  pickExternalStoreSharedOptions,
  toAssistantError,
  type AppendMessage,
  type AttachmentAdapter,
  type DictationAdapter,
  type ExternalStoreSharedOptions,
  type FeedbackAdapter,
  type RealtimeVoiceAdapter,
  type SpeechSynthesisAdapter,
} from "@assistant-ui/core";
import {
  useExternalMessageConverter,
  useExternalStoreRuntime,
  useRuntimeAdapters,
} from "@assistant-ui/core/react";
import {
  useFlueAgent,
  type SendMessageOptions,
  type UseFlueAgentOptions,
} from "@flue/react";
import { createFlueClient } from "@flue/sdk";
import { convertFlueMessage, getFlueSendMessage } from "./convertFlueMessages";
import { flueExtras } from "./flueExtras";

type FlueSendOptions = Omit<SendMessageOptions, "images">;

export type UseFlueRuntimeOptions = UseFlueAgentOptions &
  ExternalStoreSharedOptions & {
    readonly adapters?:
      | {
          readonly attachments?: AttachmentAdapter | undefined;
          readonly speech?: SpeechSynthesisAdapter | undefined;
          readonly dictation?: DictationAdapter | undefined;
          readonly voice?: RealtimeVoiceAdapter | undefined;
          readonly feedback?: FeedbackAdapter | undefined;
        }
      | undefined;
    readonly getSendOptions?:
      | ((message: AppendMessage) => FlueSendOptions | undefined)
      | undefined;
  };

/** Connect a durable Flue conversation to an assistant-ui runtime. */
export const useFlueRuntime = (options: UseFlueRuntimeOptions = {}) => {
  const {
    adapters,
    client,
    getSendOptions,
    live,
    url,
    isDisabled: _isDisabled,
    isSendDisabled: _isSendDisabled,
    suggestions: _suggestions,
    unstable_capabilities: _unstableCapabilities,
  } = options;
  const agent = useFlueAgent({
    ...(client ? { client } : url ? { url } : {}),
    ...(live && { live }),
  });
  const runtimeAdapters = useRuntimeAdapters();
  const isRunning =
    agent.status === "submitted" || agent.status === "streaming";

  const convertMessage = useMemo<
    useExternalMessageConverter.Callback<(typeof agent.messages)[number]>
  >(
    () => (message) =>
      convertFlueMessage(message, { settlements: agent.settlements }),
    [agent.settlements],
  );
  const conversionMetadata = useMemo(
    () =>
      agent.error === undefined
        ? undefined
        : { error: toAssistantError(agent.error) },
    [agent.error],
  );
  const messages = useExternalMessageConverter({
    callback: convertMessage,
    messages: agent.messages,
    isRunning,
    metadata: conversionMetadata,
  });

  const extras = useMemo(
    () =>
      flueExtras.provide({
        error: agent.error,
        failedSends: agent.failedSends,
        historyReady: agent.historyReady,
        messages: agent.messages,
        refresh: agent.refresh,
        settlements: agent.settlements,
        status: agent.status,
      }),
    [agent],
  );

  return useExternalStoreRuntime({
    ...pickExternalStoreSharedOptions(options),
    messages,
    isLoading: !agent.historyReady && agent.status === "connecting",
    isRunning,
    extras,
    adapters: {
      attachments: adapters?.attachments ?? runtimeAdapters?.attachments,
      speech: adapters?.speech,
      dictation: adapters?.dictation,
      voice: adapters?.voice,
      feedback: adapters?.feedback,
    },
    onNew: async (message) => {
      if (message.role !== "user") {
        throw new Error("Flue only accepts user messages.");
      }
      const send = getFlueSendMessage(message);
      await agent.sendMessage(send.message, {
        ...getSendOptions?.(message),
        ...(send.images && { images: [...send.images] }),
      });
    },
    ...((client || url) && {
      onCancel: async () => {
        const cancelClient = client ?? createFlueClient({ url: url! });
        await cancelClient.abort();
      },
    }),
  });
};
