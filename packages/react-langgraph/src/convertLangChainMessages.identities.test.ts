import { expect, it } from "vitest";
import { getMessagePartKeys } from "@assistant-ui/core/internal";
import { convertExternalMessages } from "@assistant-ui/core/react";
import { convertLangChainMessages } from "./convertLangChainMessages";
import type { LangChainMessage } from "./types";

it("keeps a LangGraph content block's stored key when a preceding block is inserted", () => {
  const answer = { type: "text" as const, text: "Answer", id: "answer" };
  const introduction = {
    type: "text" as const,
    text: "Introduction",
    id: "intro",
  };
  const contentOf = (content: LangChainMessage["content"]) =>
    convertExternalMessages(
      [{ type: "ai" as const, id: "message-1", content }],
      (message) => convertLangChainMessages(message, {}),
      false,
      {},
    )[0]!.content;

  const initial = contentOf([answer]);
  const updated = contentOf([introduction, answer]);

  expect(initial).toMatchObject([
    { type: "text", text: "Answer", id: "answer" },
  ]);
  expect(getMessagePartKeys(initial)).toEqual(["text:answer"]);
  expect(getMessagePartKeys(updated)).toEqual(["text:intro", "text:answer"]);
});
