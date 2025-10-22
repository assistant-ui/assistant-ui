import {
  MastraEvent,
  MastraMessage,
  MastraToolCall,
  MastraKnownEventTypes,
} from "./types";

export const mockMastraStreamCallbackFactory = (events: Array<MastraEvent>) =>
  async function* () {
    for (const event of events) {
      yield event;
    }
  };

export const createMockMastraMessage = (overrides = {}): MastraMessage => ({
  id: "mastra-test-id",
  type: "assistant",
  content: [{ type: "text", text: "Mastra response" }],
  timestamp: new Date().toISOString(),
  ...overrides,
});

export const createMockMastraEvent = (
  type: MastraKnownEventTypes,
  data: any,
): MastraEvent => ({
  id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  event: type,
  data,
  timestamp: new Date().toISOString(),
});

export const createMockToolCall = (overrides = {}): MastraToolCall => ({
  id: "tool-call-test-id",
  name: "testTool",
  arguments: { input: "test input" },
  ...overrides,
});

export const createMockStreamEvents = (
  message: string,
  includeToolCalls = false,
): Array<MastraEvent> => {
  const events: Array<MastraEvent> = [];

  // Add message partial events
  const chunks = message.split(" ");
  chunks.forEach((chunk, index) => {
    events.push({
      id: `msg-${index}`,
      event: MastraKnownEventTypes.MessagePartial,
      data: {
        id: "msg-test-id",
        type: "assistant",
        content: [
          {
            type: "text",
            text: chunk + (index < chunks.length - 1 ? " " : ""),
          },
        ],
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  });

  // Add final message complete event
  events.push({
    id: `msg-final`,
    event: MastraKnownEventTypes.MessageComplete,
    data: {
      id: "msg-test-id",
      type: "assistant",
      content: [{ type: "text", text: message }],
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });

  // Add tool call events if requested
  if (includeToolCalls) {
    const toolCall = createMockToolCall();
    events.push({
      id: `tool-${toolCall.id}`,
      event: MastraKnownEventTypes.ToolCall,
      data: toolCall,
      timestamp: new Date().toISOString(),
    });
  }

  return events;
};

export const mockFetchResponse = (events: Array<MastraEvent>) => {
  const dataString =
    events.map((event) => `data: ${JSON.stringify(event)}`).join("\n") +
    "\ndata: [DONE]\n";

  return {
    ok: true,
    body: {
      getReader: () => {
        let done = false;
        let index = 0;
        const chunks = dataString.split("\n");

        return {
          read: async () => {
            if (done) {
              return { done: true, value: undefined };
            }

            if (index >= chunks.length) {
              done = true;
              return { done: true, value: undefined };
            }

            const chunk = new TextEncoder().encode(chunks[index] + "\n");
            index++;
            return { done: false, value: chunk };
          },
        };
      },
    },
  };
};
