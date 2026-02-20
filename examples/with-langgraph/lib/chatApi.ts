import { ThreadState, Client } from "@langchain/langgraph-sdk";
import {
  LangChainMessage,
  LangGraphMessagesEvent,
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
}): AsyncGenerator<LangGraphMessagesEvent<LangChainMessage>> => {
  const client = createClient();

  const input: Record<string, unknown> | null = {
    messages: params.messages,
  };
  const config = {
    configurable: {
      model_name: "openai",
    },
  };

  return client.runs.stream(
    params.threadId,
    process.env["NEXT_PUBLIC_LANGGRAPH_ASSISTANT_ID"]!,
    {
      input,
      config,
      streamMode: "messages-tuple",
    },
  ) as AsyncGenerator<LangGraphMessagesEvent<LangChainMessage>>;
};
