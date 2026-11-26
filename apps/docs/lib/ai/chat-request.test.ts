import { describe, expect, it } from "vitest";
import {
  lastAssistantMessageIsCompleteWithToolCalls,
  type UIMessage,
} from "ai";
import {
  ChatRequestError,
  MAX_CLIENT_TOOLS,
  readChatRequest,
  stepsUsedInTurn,
} from "./chat-request";

const question = {
  id: "m1",
  role: "user",
  parts: [{ type: "text", text: "What's the weather in San Francisco?" }],
};

const weatherTool = {
  description: "Get the weather for a location.",
  parameters: {
    type: "object",
    properties: { location: { type: "string" } },
    required: ["location"],
  },
};

// The body AssistantChatTransport sends from a docs page (shape only).
const docsSampleBody = {
  id: "thread_1",
  messages: [question],
  trigger: "submit-message",
  messageId: undefined,
  metadata: {},
  callSettings: { temperature: 2 },
  system: "Remember the user's preferences.",
  config: { modelName: "deepseek/deepseek-flash" },
  tools: { get_weather: weatherTool },
  searchDocs: true,
  countConversations: true,
};

const refusalOf = (body: unknown) => {
  try {
    readChatRequest(body);
  } catch (error) {
    if (error instanceof ChatRequestError) {
      return { code: error.code, message: error.message };
    }
    throw error;
  }
  return null;
};

describe("readChatRequest", () => {
  it("accepts what the site's chat clients send", () => {
    const request = readChatRequest(docsSampleBody);

    expect(request).toEqual({
      messages: [question],
      system: "Remember the user's preferences.",
      tools: { get_weather: weatherTool },
      config: { modelName: "deepseek/deepseek-flash" },
      searchDocs: true,
      countConversations: true,
      threadId: "thread_1",
    });
  });

  it("accepts a bare request from a client with no tools or instructions", () => {
    expect(readChatRequest({ messages: [question] })).toEqual({
      messages: [question],
      system: undefined,
      tools: {},
      config: {},
      searchDocs: false,
      countConversations: false,
      threadId: undefined,
    });
  });

  it("keeps only a tool's name, description and input schema", () => {
    const request = readChatRequest({
      messages: [question],
      tools: {
        get_weather: {
          ...weatherTool,
          providerOptions: { openai: { strict: false } },
        },
      },
    });

    expect(request.tools.get_weather).toEqual(weatherTool);
    expect(request).not.toHaveProperty("callSettings");
  });

  it.each([
    ["a body that is not an object", "nope", "invalid_request"],
    ["missing messages", {}, "invalid_messages"],
    ["no messages", { messages: [] }, "no_messages"],
    [
      "a system message",
      { messages: [{ role: "system", parts: [] }] },
      "unsupported_role",
    ],
    [
      "a message without parts",
      { messages: [{ role: "user", content: "hi" }] },
      "invalid_message",
    ],
    [
      "a part without a type",
      { messages: [{ role: "user", parts: [{ text: "hi" }] }] },
      "invalid_part",
    ],
    [
      "too many parts",
      {
        messages: [
          {
            role: "assistant",
            parts: Array.from({ length: 401 }, () => ({ type: "text" })),
          },
        ],
      },
      "too_many_parts",
    ],
    [
      "a system that is not text",
      { messages: [question], system: 1 },
      "invalid_system",
    ],
    [
      "tools that are not an object",
      { messages: [question], tools: "search" },
      "invalid_tools",
    ],
    [
      "tools over the size limit",
      {
        messages: [question],
        tools: { search: { ...weatherTool, description: "x".repeat(96_000) } },
      },
      "tools_too_large",
    ],
    [
      "too many tools",
      {
        messages: [question],
        tools: Object.fromEntries(
          Array.from({ length: MAX_CLIENT_TOOLS + 1 }, (_, i) => [
            `tool_${i}`,
            weatherTool,
          ]),
        ),
      },
      "too_many_tools",
    ],
    [
      "a tool name a model API refuses",
      { messages: [question], tools: { "get weather": weatherTool } },
      "invalid_tool",
    ],
    [
      "a tool without an input schema",
      { messages: [question], tools: { get_weather: { description: "x" } } },
      "invalid_tool",
    ],
    [
      "a model name that is not text",
      { messages: [question], config: { modelName: 7 } },
      "invalid_config",
    ],
    [
      "a flag that is not a boolean",
      { messages: [question], searchDocs: "yes" },
      "invalid_option",
    ],
    [
      "an oversized thread id",
      { messages: [question], id: "t".repeat(201) },
      "invalid_option",
    ],
  ])("refuses %s", (_, body, code) => {
    expect(refusalOf(body)?.code).toBe(code);
  });

  it("answers the refusals the route had before with the same text", () => {
    expect(refusalOf({ messages: [] })?.message).toBe("No messages provided");
    expect(refusalOf({ messages: [question], tools: "search" })?.message).toBe(
      "Invalid tools format",
    );
  });
});

describe("stepsUsedInTurn", () => {
  const assistant = (parts: UIMessage["parts"]): UIMessage => ({
    id: "a1",
    role: "assistant",
    parts,
  });

  it("is zero for a new question", () => {
    expect(stepsUsedInTurn([question as UIMessage])).toBe(0);
  });

  it("counts the steps of the assistant message a browser tool continues", () => {
    expect(
      stepsUsedInTurn([
        question as UIMessage,
        assistant([
          { type: "step-start" },
          { type: "text", text: "Looking it up." },
          { type: "step-start" },
          {
            type: "tool-get_weather",
            toolCallId: "c1",
            state: "output-available",
            input: { location: "SF" },
            output: { temperature: 18 },
          },
        ]),
      ]),
    ).toBe(2);
  });

  it("counts at least one step for an assistant message without step markers", () => {
    expect(
      stepsUsedInTurn([
        question as UIMessage,
        assistant([{ type: "text", text: "Hi" }]),
      ]),
    ).toBe(1);
  });
});

// The route makes the last step a request may run answer without tools. A
// turn that used every step therefore ends on text, and the client's
// automatic resend (lastAssistantMessageIsCompleteWithToolCalls) does not
// fire, while a turn that stops on a browser tool still continues.
describe("automatic resend after a turn", () => {
  const toolStep = [
    { type: "step-start" },
    {
      type: "tool-search_images",
      toolCallId: "c1",
      state: "output-available",
      input: { query: "x" },
      output: [],
    },
  ] as UIMessage["parts"];

  it("does not follow a capped turn whose last step answered", () => {
    const capped: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [
        ...toolStep,
        ...toolStep,
        { type: "step-start" },
        { type: "text", text: "Here is what I found." },
      ],
    };
    expect(
      lastAssistantMessageIsCompleteWithToolCalls({
        messages: [question as UIMessage, capped],
      }),
    ).toBe(false);
  });

  it("still follows a step that ended on a browser tool's result", () => {
    const browserTool: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: toolStep,
    };
    expect(
      lastAssistantMessageIsCompleteWithToolCalls({
        messages: [question as UIMessage, browserTool],
      }),
    ).toBe(true);
  });
});
