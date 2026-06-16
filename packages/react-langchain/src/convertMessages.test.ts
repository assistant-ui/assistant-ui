import { describe, expect, it } from "vitest";
import { convertLangChainBaseMessage } from "./convertMessages";
import type { LangChainBaseMessage } from "./types";

const humanMessage = (content: unknown): LangChainBaseMessage => ({
  _getType: () => "human",
  id: "msg-1",
  content,
});

describe("convertLangChainBaseMessage file content parts", () => {
  it("converts a flat data file block", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([
        {
          type: "file",
          data: "ZmFrZQ==",
          mime_type: "application/pdf",
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

  it("converts a legacy nested file block", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([
        {
          type: "file",
          file: {
            filename: "b.pdf",
            file_data: "YmFzZTY0",
            mime_type: "application/pdf",
          },
        },
      ]),
      {},
    );

    expect(result.content).toEqual([
      {
        type: "file",
        filename: "b.pdf",
        data: "YmFzZTY0",
        mimeType: "application/pdf",
      },
    ]);
  });

  it("converts a top-level base64 file block", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([
        {
          type: "file",
          base64: "dG9w",
          mime_type: "application/pdf",
          filename: "c.pdf",
        },
      ]),
      {},
    );

    expect(result.content).toEqual([
      {
        type: "file",
        filename: "c.pdf",
        data: "dG9w",
        mimeType: "application/pdf",
      },
    ]);
  });

  it("drops an unrecognized file block shape", () => {
    const result = convertLangChainBaseMessage(
      humanMessage([{ type: "file", unknown: true } as never]),
      {},
    );

    expect(result.content).toEqual([]);
  });
});
