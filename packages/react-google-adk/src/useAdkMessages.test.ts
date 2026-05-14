import { describe, expect, it } from "vitest";
import { messageToEvent } from "./useAdkMessages";
import type { AdkMessage } from "./types";

describe("messageToEvent (contentToParts)", () => {
  it("serializes a file content part as inlineData", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [
        {
          type: "file",
          mimeType: "application/pdf",
          data: "JVBERi0xLjQK",
          filename: "report.pdf",
        },
      ],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      { inlineData: { mimeType: "application/pdf", data: "JVBERi0xLjQK" } },
    ]);
  });

  it("serializes a file_url content part as fileData with mimeType", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [
        {
          type: "file_url",
          url: "gs://bucket/report.pdf",
          mimeType: "application/pdf",
        },
      ],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      {
        fileData: {
          fileUri: "gs://bucket/report.pdf",
          mimeType: "application/pdf",
        },
      },
    ]);
  });

  it("serializes a file_url without mimeType as bare fileData", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [{ type: "file_url", url: "gs://bucket/unknown" }],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      { fileData: { fileUri: "gs://bucket/unknown" } },
    ]);
  });

  it("serializes mixed text + file content as multiple parts", () => {
    const msg: AdkMessage = {
      id: "m1",
      type: "human",
      content: [
        { type: "text", text: "see attached" },
        { type: "file", mimeType: "image/png", data: "AAAA" },
      ],
    };
    const event = messageToEvent(msg);
    expect(event.content?.parts).toEqual([
      { text: "see attached" },
      { inlineData: { mimeType: "image/png", data: "AAAA" } },
    ]);
  });
});
