import { ThreadState, Client } from "@langchain/langgraph-sdk";
import {
  LangChainMessage,
  LangGraphMessagesEvent,
  LangGraphSendMessageConfig,
} from "@assistant-ui/react-langgraph";

const createClient = () => {
  const apiUrl =
    process.env["NEXT_PUBLIC_LANGGRAPH_API_URL"] ||
    new URL("/api", window.location.href).href;
  return new Client({
    apiUrl,
  });
};

export const createAssistant = async (graphId: string) => {
  const client = createClient();
  return client.assistants.create({ graphId });
};

export const createThread = async () => {
  const client = createClient();
  return client.threads.create();
};

export const getThreadState = async (
  threadId: string,
): Promise<ThreadState<Record<string, unknown>>> => {
  const client = createClient();
  return client.threads.getState(threadId);
};

const matchesParentMessages = (
  stateMessages: LangChainMessage[] | undefined,
  parentMessages: LangChainMessage[],
) => {
  if (!stateMessages || stateMessages.length !== parentMessages.length) {
    return false;
  }

  const hasStableIds =
    parentMessages.every((message) => typeof message.id === "string") &&
    stateMessages.every((message) => typeof message.id === "string");

  if (!hasStableIds) {
    return false;
  }

  return parentMessages.every(
    (message, index) => message.id === stateMessages[index]?.id,
  );
};

export const getCheckpointId = async (
  threadId: string,
  parentMessages: LangChainMessage[],
): Promise<string | null> => {
  const client = createClient();
  const history = await client.threads.getHistory(threadId);
  for (const state of history) {
    const stateMessages = (state.values as { messages?: LangChainMessage[] })
      .messages;
    if (matchesParentMessages(stateMessages, parentMessages)) {
      return state.checkpoint.checkpoint_id ?? null;
    }
  }
  return null;
};

export const updateState = async (
  threadId: string,
  fields: {
    newState: Record<string, unknown>;
    asNode?: string;
  },
) => {
  const client = createClient();
  return client.threads.updateState(threadId, {
    values: fields.newState,
    asNode: fields.asNode!,
  });
};

export const sendMessage = (params: {
  threadId: string;
  messages: LangChainMessage[];
  config?: LangGraphSendMessageConfig;
}): AsyncGenerator<LangGraphMessagesEvent<LangChainMessage>> => {
  const client = createClient();

  const { checkpointId, ...restConfig } = params.config ?? {};

  return client.runs.stream(
    params.threadId,
    process.env["NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID"]!,
    {
      input: params.messages.length > 0 ? { messages: params.messages } : null,
      config: {
        configurable: {
          model_name: "openai",
        },
      },
      streamMode: "messages-tuple",
      ...(checkpointId && { checkpoint_id: checkpointId }),
      ...restConfig,
    },
  ) as AsyncGenerator<LangGraphMessagesEvent<LangChainMessage>>;
};
