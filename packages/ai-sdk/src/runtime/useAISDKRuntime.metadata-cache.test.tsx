// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react";
import type { UIMessage } from "ai";
import type { ExternalStoreAdapter } from "@assistant-ui/core";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  adapter: undefined as ExternalStoreAdapter | undefined,
  conversions: vi.fn<(messageId: string) => void>(),
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...original,
    useExternalStoreRuntime: vi.fn((adapter: ExternalStoreAdapter) => {
      mocks.adapter = adapter;
      return {};
    }),
    useRuntimeAdapters: vi.fn(() => ({})),
  };
});

vi.mock("../converters/convertMessage", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("../converters/convertMessage")>();
  return {
    ...original,
    convertAISDKMessage: (
      ...args: Parameters<typeof original.convertAISDKMessage>
    ) => {
      mocks.conversions(args[0].id);
      return original.convertAISDKMessage(...args);
    },
  };
});

import { useAISDKRuntime } from "./useAISDKRuntime";

const MESSAGE_COUNT = 1_000;
const messages: UIMessage[] = Array.from({ length: MESSAGE_COUNT }, (_, i) =>
  i % 2 === 0
    ? { id: `m${i}`, role: "user", parts: [{ type: "text", text: `q${i}` }] }
    : {
        id: `m${i}`,
        role: "assistant",
        parts: [
          {
            type: "tool-search",
            toolCallId: `call-m${i}`,
            state:
              i === MESSAGE_COUNT - 1 ? "input-available" : "output-available",
            input: { query: `q${i}` },
            ...(i !== MESSAGE_COUNT - 1 && { output: { hits: i } }),
          } as UIMessage["parts"][number],
          { type: "text", text: `a${i}` },
        ],
      },
);
const LAST_ID = `m${MESSAGE_COUNT - 1}`;
const MIDDLE_ID = `m${MESSAGE_COUNT / 2 + 1}`;

const createChatHelpers = (status: string, error?: Error) => ({
  id: "chat-1",
  status,
  error,
  messages,
  setMessages: vi.fn(),
  sendMessage: vi.fn(),
  regenerate: vi.fn(),
  addToolOutput: vi.fn().mockResolvedValue(undefined),
  addToolApprovalResponse: vi.fn(),
  stop: vi.fn(),
});

type ChatState = { status: string; error?: Error };

const renderRuntime = () => {
  const initialProps: ChatState = { status: "ready" };
  const view = renderHook(
    ({ status, error }: ChatState) =>
      useAISDKRuntime(createChatHelpers(status, error) as never),
    { initialProps },
  );
  expect(mocks.conversions).toHaveBeenCalledTimes(MESSAGE_COUNT);
  return view;
};

type Step = [
  action: (view: ReturnType<typeof renderRuntime>) => unknown,
  converts: readonly string[],
];

const interrupt = {
  type: "interrupt" as const,
  payload: { type: "human" as const, payload: { question: "which?" } },
};

const cases: Record<string, Step[]> = {
  "a tool status moves between messages": [
    [
      () => mocks.adapter!.setToolStatuses!({ [`call-${LAST_ID}`]: interrupt }),
      [LAST_ID],
    ],
    [
      () =>
        mocks.adapter!.setToolStatuses!({ [`call-${MIDDLE_ID}`]: interrupt }),
      [MIDDLE_ID, LAST_ID],
    ],
  ],
  "a tool result records an artifact": [
    [
      () =>
        mocks.adapter!.onAddToolResult!({
          messageId: MIDDLE_ID,
          toolCallId: `call-${MIDDLE_ID}`,
          toolName: "search",
          result: { hits: 1 },
          isError: false,
          artifact: { chart: "bar" },
        }),
      [MIDDLE_ID],
    ],
  ],
  "a run starts and ends": [
    [({ rerender }) => rerender({ status: "streaming" }), [LAST_ID]],
    // The run end clears the optimistic flag, then the finalized timing lands
    // in a second render.
    [({ rerender }) => rerender({ status: "ready" }), [LAST_ID, LAST_ID]],
  ],
  "the chat errors": [
    [
      ({ rerender }) => rerender({ status: "error", error: new Error("boom") }),
      [],
    ],
  ],
};

describe("useAISDKRuntime metadata cache", () => {
  it.each(Object.entries(cases))(
    "re-converts only the affected messages when %s",
    async (_, steps) => {
      const view = renderRuntime();
      for (const [action, converts] of steps) {
        mocks.conversions.mockClear();
        await act(async () => {
          await action(view);
        });
        expect(
          mocks.conversions.mock.calls.map(([messageId]) => messageId),
        ).toEqual(converts);
      }
    },
  );
});
