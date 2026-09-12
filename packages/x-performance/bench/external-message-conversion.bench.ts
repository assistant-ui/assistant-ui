import {
  convertExternalMessages,
  type useExternalMessageConverter,
} from "@assistant-ui/core/react";
import { describe, test } from "vitest";

type Message = useExternalMessageConverter.Message;

const makeToolCallMessage = (count: number): Message => ({
  role: "assistant" as const,
  content: Array.from({ length: count }, (_, index) => ({
    type: "tool-call" as const,
    toolCallId: `call-${index}`,
    toolName: "search",
    args: { query: `query-${index}` },
  })),
});

const makeToolResults = (count: number): Message[] => [
  makeToolCallMessage(count),
  ...Array.from({ length: count }, (_, index) => ({
    role: "tool" as const,
    toolCallId: `call-${index}`,
    result: { index },
  })),
];

const makeReasoningContinuations = (count: number): Message[] => [
  {
    role: "assistant",
    content: [
      ...Array.from({ length: count }, (_, index) => ({
        type: "reasoning" as const,
        parentId: `reasoning-${index}`,
        text: `start-${index}`,
      })),
      ...Array.from({ length: count }, (_, index) => ({
        type: "reasoning" as const,
        parentId: `reasoning-${index}`,
        text: `end-${index}`,
      })),
    ],
  },
];

const benchmarkScenario = (
  name: string,
  makeOutputs: (count: number) => Message[],
) => {
  describe(`core: external message ${name}`, () => {
    for (const count of [100, 1_000, 5_000]) {
      const inputs = [{ outputs: makeOutputs(count) }];
      test(`${count} matches`, async ({ bench }) => {
        await bench(`${count} matches`, () => {
          convertExternalMessages(inputs, (input) => input.outputs, false, {});
        }).run();
      });
    }
  });
};

benchmarkScenario("unique tool calls", (count) => [makeToolCallMessage(count)]);
benchmarkScenario("tool results", makeToolResults);
benchmarkScenario("reasoning continuations", makeReasoningContinuations);
