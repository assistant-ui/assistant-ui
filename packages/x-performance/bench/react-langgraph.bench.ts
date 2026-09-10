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

const makeDeltas = (size: number) =>
  JSON.stringify({ text: "x".repeat(size) }).match(/[\s\S]{1,16}/g)!;

describe("react-langgraph: streamed tool argument accumulation", () => {
  for (const size of [1_000, 10_000, 50_000]) {
    const deltas = makeDeltas(size);
    bench(`${size} character argument in 16-character deltas`, () => {
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
    });
  }
});
