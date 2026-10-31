import { describe, expect, it } from "vitest";
import { getMessagePartKeys } from "@assistant-ui/core/internal";
import { convertExternalMessages } from "@assistant-ui/core/react";
import { convertLangChainBaseMessage } from "./convertMessages";
import { convertLangChainContentBlock } from "./converter";

const blocks = [
  { type: "text", text: "Answer", id: "text-1" },
  { type: "reasoning", reasoning: "Thinking", id: "reasoning-1" },
  { type: "image", url: "https://example.com/image.png", id: "image-1" },
  {
    type: "file",
    fileId: "file-handle",
    mimeType: "application/pdf",
    id: "file-1",
  },
  { type: "audio", base64: "c291bmQ=", mime_type: "audio/wav", id: "audio-1" },
  {
    type: "video",
    url: "https://example.com/video.mp4",
    mimeType: "video/mp4",
    id: "video-1",
  },
  { type: "text-plain", text: "Notes", id: "document-1" },
] as const;

describe("LangChain content block identities", () => {
  it.each(blocks)("preserves the block identity for $type", (block) => {
    expect(convertLangChainContentBlock(block)).toHaveProperty("id", block.id);
  });

  it("keeps a standard file's block identity separate from its file handle", () => {
    expect(convertLangChainContentBlock(blocks[3])).toEqual({
      type: "file",
      id: "file-1",
      filename: "file",
      data: "file-handle",
      mimeType: "application/pdf",
      sourceType: "id",
    });
  });

  it("does not treat a legacy file handle as a block identity", () => {
    expect(
      convertLangChainContentBlock({
        type: "file",
        source_type: "id",
        id: "file-handle",
        mime_type: "application/pdf",
      }),
    ).toEqual({
      type: "file",
      filename: "file",
      data: "file-handle",
      mimeType: "application/pdf",
      sourceType: "id",
    });
  });

  it.each([undefined, 42, null])(
    "ignores a non-string block identity %s",
    (id) => {
      const block = { type: "text" as const, text: "Answer", id };
      expect(convertLangChainContentBlock(block)).toEqual({
        type: "text",
        text: "Answer",
      });
    },
  );

  it("keeps empty reasoning and source-less media filtered even with an id", () => {
    const reasoning = {
      type: "reasoning" as const,
      reasoning: " ",
      id: "reasoning-1",
    };
    expect(convertLangChainContentBlock(reasoning)).toBeNull();
    expect(
      convertLangChainContentBlock({ type: "image", id: "image-1" }),
    ).toBeUndefined();
  });

  it("keeps an exploded reasoning part's key when another summary arrives", () => {
    const contentOf = (content: unknown) =>
      convertExternalMessages(
        [{ _getType: () => "ai", id: "message-1", content }],
        (message) => convertLangChainBaseMessage(message),
        false,
        {},
      )[0]!.content;
    const first = {
      type: "reasoning",
      id: "rs_1",
      index: "lc_rs_305f30",
      reasoning: "First summary",
    };
    const initial = contentOf([first]);
    const final = contentOf([
      first,
      {
        type: "reasoning",
        id: "rs_1",
        index: "lc_rs_305f31",
        reasoning: "Second summary",
      },
    ]);
    const initialKeys = getMessagePartKeys(initial);
    const finalKeys = getMessagePartKeys(final);

    expect(final).toMatchObject([
      { type: "reasoning", text: "First summary" },
      { type: "reasoning", text: "Second summary" },
    ]);
    expect(finalKeys[0]).toBe(initialKeys[0]);
    expect(finalKeys[1]).not.toBe(finalKeys[0]);
  });

  it("keeps the stored part key when another block is inserted before it", () => {
    const contentOf = (content: unknown) =>
      convertExternalMessages(
        [{ _getType: () => "ai", id: "message-1", content }],
        (message) => convertLangChainBaseMessage(message),
        false,
        {},
      )[0]!.content;
    const answer = blocks[0];
    const initial = contentOf([answer]);
    const updated = contentOf([
      { type: "text", text: "Introduction", id: "intro" },
      answer,
    ]);

    expect(initial).toMatchObject([
      { type: "text", id: "text-1", text: "Answer" },
    ]);
    expect(getMessagePartKeys(initial)).toEqual(["text:text-1"]);
    expect(getMessagePartKeys(updated)).toEqual(["text:intro", "text:text-1"]);
  });
});
