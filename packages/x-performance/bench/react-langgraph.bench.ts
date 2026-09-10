import { bench, describe } from "vitest";
import {
  appendLangChainChunk,
  convertLangChainMessages,
  type LangChainMessage,
  type LangChainMessageChunk,
} from "@assistant-ui/react-langgraph";

type AiMessage = Extract<LangChainMessage, { type: "ai" }>;

const append = appendLangChainChunk as (
  previous: AiMessage | undefined,
  chunk: LangChainMessageChunk,
) => AiMessage;

const makeDeltas = (value: unknown) =>
  JSON.stringify(value).match(/[\s\S]{1,16}/g)!;

const runDeltas = (deltas: string[]) => {
  let accumulated: AiMessage | undefined;
  for (const args of deltas) {
    accumulated = append(accumulated, {
      type: "AIMessageChunk",
      id: "ai-1",
      content: "",
      tool_call_chunks: [{ id: "call-1", index: 0, name: "write", args }],
    });
    convertLangChainMessages(accumulated, {});
  }
};

describe("react-langgraph: streamed tool argument accumulation", () => {
  for (const size of [1_000, 10_000, 50_000]) {
    const deltas = makeDeltas({ text: "x".repeat(size) });
    bench(`${size} character argument in 16-character deltas`, () => {
      runDeltas(deltas);
    });
  }

  const wideDeltas = makeDeltas({
    edits: Array.from({ length: 500 }, (_, index) => ({
      line: index,
      text: `replacement-${index}`,
    })),
  });
  bench("500 short object entries in 16-character deltas", () => {
    runDeltas(wideDeltas);
  });
});
