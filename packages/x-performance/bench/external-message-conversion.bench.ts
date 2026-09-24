import {
  convertExternalMessages,
  createExternalMessageConversionCache,
  type useExternalMessageConverter,
} from "@assistant-ui/core/react";
import { describe, inject, test } from "vitest";

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
        }).run(inject("benchSampling"));
      });
    }
  });
};

benchmarkScenario("unique tool calls", (count) => [makeToolCallMessage(count)]);
benchmarkScenario("tool results", makeToolResults);
benchmarkScenario("reasoning continuations", makeReasoningContinuations);

type CachedInput = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const convertCachedInput = (message: CachedInput) => ({
  id: message.id,
  role: message.role,
  content: message.text,
});

describe("core: cached external message conversion with a changed tail", () => {
  for (const count of [10, 100, 1000]) {
    test(`${count} messages`, async ({ bench }) => {
      let messages: CachedInput[] = Array.from(
        { length: count },
        (_, index) => ({
          id: `m${index}`,
          role: index % 2 ? "assistant" : "user",
          text: `message ${index}`,
        }),
      );
      const cache = createExternalMessageConversionCache();
      const metadata = {};
      convertExternalMessages(
        messages,
        convertCachedInput,
        true,
        metadata,
        cache,
      );
      let flip = false;

      await bench(`${count} messages`, () => {
        flip = !flip;
        messages = [
          ...messages.slice(0, -1),
          { ...messages.at(-1)!, text: flip ? "token a" : "token b" },
        ];
        convertExternalMessages(
          messages,
          convertCachedInput,
          true,
          metadata,
          cache,
        );
      }).run();
    });
  }
});
