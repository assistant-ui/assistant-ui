/// <reference types="@assistant-ui/core/store" />
import { useState, useCallback, useRef, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { useAui } from "@assistant-ui/store";
import { AdkEventAccumulator } from "./AdkEventAccumulator";
import type {
  AdkEvent,
  AdkEventPart,
  AdkMessage,
  AdkMessageContentPart,
  AdkMessageMetadata,
  AdkSendMessageConfig,
  AdkStreamCallback,
  AdkToolConfirmation,
  AdkAuthRequest,
  OnAdkErrorCallback,
  OnAdkCustomEventCallback,
  OnAdkAgentTransferCallback,
} from "./types";

export type UseAdkMessagesOptions = {
  stream: AdkStreamCallback;
  eventHandlers?: {
    onError?: OnAdkErrorCallback;
    onCustomEvent?: OnAdkCustomEventCallback;
    onAgentTransfer?: OnAdkAgentTransferCallback;
  };
};

export const useAdkMessages = ({
  stream,
  eventHandlers,
}: UseAdkMessagesOptions) => {
  const [messages, _setMessages] = useState<AdkMessage[]>([]);
  const [stateDelta, setStateDelta] = useState<Record<string, unknown>>({});
  const [agentInfo, setAgentInfo] = useState<{
    name?: string | undefined;
    branch?: string | undefined;
  }>({});
  const [longRunningToolIds, setLongRunningToolIds] = useState<string[]>([]);
  const [artifactDelta, setArtifactDelta] = useState<Record<string, number>>(
    {},
  );
  const [toolConfirmations, setToolConfirmations] = useState<
    AdkToolConfirmation[]
  >([]);
  const [authRequests, setAuthRequests] = useState<AdkAuthRequest[]>([]);
  const [escalated, setEscalated] = useState(false);
  const [messageMetadata, setMessageMetadata] = useState<
    Map<string, AdkMessageMetadata>
  >(new Map());
  const lastTransferToAgentRef = useRef<string | undefined>(undefined);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const stateDeltaRef = useRef(stateDelta);
  stateDeltaRef.current = stateDelta;
  const artifactDeltaRef = useRef(artifactDelta);
  artifactDeltaRef.current = artifactDelta;
  const messageMetadataRef = useRef(messageMetadata);
  messageMetadataRef.current = messageMetadata;

  const setMessagesImmediate = useCallback((msgs: AdkMessage[]) => {
    messagesRef.current = msgs;
    _setMessages(msgs);
  }, []);

  // Replace the message list AND reset derived per-turn HITL state.
  // Used by truncation paths (edit, reload, load) so that stale interrupt
  // markers and per-message metadata from the removed messages don't leak
  // into the next turn.
  const replaceMessages = useCallback(
    (msgs: AdkMessage[]) => {
      setMessagesImmediate(msgs);
      setLongRunningToolIds([]);
      setToolConfirmations([]);
      setAuthRequests([]);
      setEscalated(false);
      setMessageMetadata(new Map());
    },
    [setMessagesImmediate],
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  const { onError, onCustomEvent, onAgentTransfer } = useMemo(
    () => eventHandlers ?? {},
    [eventHandlers],
  );

  const aui = useAui();
  const sendMessage = useCallback(
    async (newMessages: AdkMessage[], config: AdkSendMessageConfig) => {
      const newMessagesWithId = newMessages.map((m) =>
        m.id ? m : { ...m, id: uuidv4() },
      ) as AdkMessage[];

      const accumulator = new AdkEventAccumulator(messagesRef.current);
      for (const msg of newMessagesWithId) {
        accumulator.processEvent(messageToEvent(msg));
      }
      setMessagesImmediate(accumulator.getMessages());

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await stream(newMessagesWithId, {
          ...config,
          abortSignal: abortController.signal,
          initialize: async () => {
            return await aui.threadListItem().initialize();
          },
        });

        for await (const event of response) {
          const updatedMessages = accumulator.processEvent(event);
          setMessagesImmediate(updatedMessages);
          setStateDelta({
            ...stateDeltaRef.current,
            ...accumulator.getStateDelta(),
          });
          setAgentInfo(accumulator.getAgentInfo());
          setLongRunningToolIds(accumulator.getLongRunningToolIds());
          setArtifactDelta({
            ...artifactDeltaRef.current,
            ...accumulator.getArtifactDelta(),
          });
          setToolConfirmations(accumulator.getToolConfirmations());
          setAuthRequests(accumulator.getAuthRequests());
          setEscalated(accumulator.isEscalated());
          {
            const newMeta = accumulator.getMessageMetadata();
            if (newMeta.size > 0) {
              setMessageMetadata(
                new Map([...messageMetadataRef.current, ...newMeta]),
              );
            }
          }

          const transfer = accumulator.getLastTransferToAgent();
          if (transfer && transfer !== lastTransferToAgentRef.current) {
            lastTransferToAgentRef.current = transfer;
            onAgentTransfer?.(transfer);
          }

          // Fire custom event callback for events with customMetadata
          if (event.customMetadata && onCustomEvent) {
            for (const [key, value] of Object.entries(event.customMetadata)) {
              onCustomEvent(key, value);
            }
          }

          if (event.errorCode || event.errorMessage) {
            onError?.(event.errorMessage ?? event.errorCode);
          }
        }
      } catch (error) {
        if (
          !abortController.signal.aborted &&
          !(error instanceof Error && error.name === "AbortError")
        ) {
          throw error;
        }
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    [
      aui,
      setMessagesImmediate,
      stream,
      onError,
      onCustomEvent,
      onAgentTransfer,
    ],
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    messages,
    stateDelta,
    agentInfo,
    longRunningToolIds,
    artifactDelta,
    toolConfirmations,
    authRequests,
    escalated,
    messageMetadata,
    sendMessage,
    cancel,
    setMessages: setMessagesImmediate,
    replaceMessages,
  };
};

const messageToEvent = (msg: AdkMessage): AdkEvent => {
  if (msg.type === "human") {
    return {
      id: msg.id ?? uuidv4(),
      author: "user",
      content: { role: "user", parts: contentToParts(msg.content) },
    };
  }

  if (msg.type === "tool") {
    let response: unknown;
    try {
      response = JSON.parse(msg.content);
    } catch {
      response = msg.content;
    }
    return {
      id: msg.id ?? uuidv4(),
      content: {
        role: "user",
        parts: [
          {
            functionResponse: {
              name: msg.name,
              id: msg.tool_call_id,
              response,
            },
          },
        ],
      },
    };
  }

  const result: AdkEvent = { id: msg.id ?? uuidv4() };
  if (msg.author != null) result.author = msg.author;
  result.content = {
    role: "model",
    parts: [
      ...contentToParts(msg.content),
      ...(msg.tool_calls?.map((tc) => ({
        functionCall: { name: tc.name, id: tc.id, args: { ...tc.args } },
      })) ?? []),
    ],
  };
  return result;
};

const contentToParts = (
  content: string | AdkMessageContentPart[],
): AdkEventPart[] => {
  if (typeof content === "string") return [{ text: content }];
  return content.map((part) => {
    switch (part.type) {
      case "text":
        return { text: part.text };
      case "reasoning":
        return { text: part.text, thought: true };
      case "image":
        return { inlineData: { mimeType: part.mimeType, data: part.data } };
      case "image_url":
        return { fileData: { fileUri: part.url } };
      case "code":
        return {
          executableCode: { code: part.code, language: part.language },
        };
      case "code_result":
        return {
          codeExecutionResult: { output: part.output, outcome: part.outcome },
        };
      default:
        return { text: "" };
    }
  });
};
