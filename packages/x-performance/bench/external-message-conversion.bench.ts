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

const makeFinishedMessage = (index: number, parts: number): Message =>
  index % 2 === 0
    ? { id: `m${index}`, role: "user", content: `question ${index}` }
    : {
        id: `m${index}`,
        role: "assistant",
        content: Array.from({ length: parts }, (_, part) =>
          part % 2 === 0
            ? { type: "text" as const, text: `answer ${index}.${part}` }
            : {
                type: "tool-call" as const,
                toolCallId: `call-${index}-${part}`,
                toolName: "search",
                args: { query: `query-${index}-${part}` },
                result: { part },
              },
        ),
      };

// Every sample converts a fresh streaming message behind a cached history, as
// a token delta does through useExternalMessageConverter.
describe("core: cached external message conversion, one streaming delta", () => {
  for (const [count, parts] of [
    [1_000, 6],
    [5_000, 20],
  ] as const) {
    test(`${count} messages, ${parts}-part replies`, async ({ bench }) => {
      // The history ends on a user turn so the streaming reply forms its own
      // chunk instead of joining the last finished reply.
      const history = Array.from({ length: count - 1 }, (_, index) => ({
        outputs: [makeFinishedMessage(index, parts)],
      }));
      const callback = (input: { outputs: Message[] }) => input.outputs;
      const metadata = {};
      const cache = createExternalMessageConversionCache();
      let tokens = 0;
      const delta = () => {
        tokens += 1;
        const sources = history.slice();
        sources.push({
          outputs: [
            {
              id: "streaming",
              role: "assistant",
              content: `token ${tokens}`,
            },
          ],
        });
        convertExternalMessages(sources, callback, true, metadata, cache);
      };
      delta();
      await bench(`${count} messages, ${parts}-part replies`, delta).run(
        inject("benchSampling"),
      );
    });
  }
});
