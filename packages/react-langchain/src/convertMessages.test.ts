import { describe, expect, it } from "vitest";
import { convertLangChainBaseMessage } from "./convertMessages";
import type { LangChainBaseMessage } from "./types";

const humanMessage = (content: unknown): LangChainBaseMessage => ({
  _getType: () => "human",
  id: "msg-1",
  content,
});

const aiMessage = (content: unknown): LangChainBaseMessage => ({
  _getType: () => "ai",
  id: "msg-1",
  content,
});

describe("convertLangChainBaseMessage file content parts", () => {
  it("converts a base64 file block", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([
        {
          type: "file",
          data: "ZmFrZQ==",
          mime_type: "application/pdf",
          source_type: "base64",
          metadata: { filename: "a.pdf" },
        },
      ]),
      {},
    );

    expect(result.content).toEqual([
      {
        type: "file",
        filename: "a.pdf",
        data: "ZmFrZQ==",
        mimeType: "application/pdf",
      },
    ]);
  });

  it("falls back to a default filename when metadata is absent", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([
        { type: "file", data: "ZmFrZQ==", mime_type: "application/pdf" },
      ]),
      {},
    );

    expect(result.content).toEqual([
      {
        type: "file",
        filename: "file",
        data: "ZmFrZQ==",
        mimeType: "application/pdf",
      },
    ]);
  });
});

describe("convertLangChainBaseMessage reasoning content parts", () => {
  it("joins summary text blocks", () => {
    const result = convertLangChainBaseMessage(
      aiMessage([
        {
          type: "reasoning",
          summary: [
            { type: "summary_text", text: "a" },
            { type: "summary_text", text: "b" },
          ],
        },
      ]),
      {},
    );

    expect(result.content).toEqual([{ type: "reasoning", text: "a\n\n\nb" }]);
  });

  it("falls back to the reasoning string when summary is absent", () => {
    const result = convertLangChainBaseMessage(
      aiMessage([{ type: "reasoning", reasoning: "thinking..." }]),
      {},
    );

    expect(result.content).toEqual([
      { type: "reasoning", text: "thinking..." },
    ]);
  });

  it("falls back to empty text when neither summary nor reasoning is present", () => {
    const result = convertLangChainBaseMessage(
      aiMessage([{ type: "reasoning" }]),
      {},
    );

    expect(result.content).toEqual([{ type: "reasoning", text: "" }]);
  });
});
