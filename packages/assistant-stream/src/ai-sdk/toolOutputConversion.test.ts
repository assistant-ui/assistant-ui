import { describe, expect, it } from "vitest";
import type { ToolModelContentPart } from "../core/tool/tool-types";
import { toAISDKContent, toAISDKDefaultOutput } from "./toolOutputConversion";

describe("toAISDKContent", () => {
  it("emits text parts as-is and file parts in the provider spec's `file` shape", () => {
    expect(
      toAISDKContent([
        { type: "text", text: "PDF contents:" },
        {
          type: "file",
          data: "JVBERi0xLjQK",
          mediaType: "application/pdf",
          filename: "doc.pdf",
        },
      ]),
    ).toEqual({
      type: "content",
      value: [
        { type: "text", text: "PDF contents:" },
        {
          type: "file",
          data: { type: "data", data: "JVBERi0xLjQK" },
          mediaType: "application/pdf",
          filename: "doc.pdf",
        },
      ],
    });
  });

  it("defaults a malformed file part without mediaType to application/octet-stream and omits filename", () => {
    const part = {
      type: "file",
      data: "AAAA",
    } as unknown as ToolModelContentPart;

    expect(toAISDKContent([part])).toEqual({
      type: "content",
      value: [
        {
          type: "file",
          data: { type: "data", data: "AAAA" },
          mediaType: "application/octet-stream",
        },
      ],
    });
  });
});

describe("toAISDKDefaultOutput", () => {
  it("wraps strings as text and everything else as json", () => {
    expect(toAISDKDefaultOutput("done")).toEqual({
      type: "text",
      value: "done",
    });
    expect(toAISDKDefaultOutput({ ok: true })).toEqual({
      type: "json",
      value: { ok: true },
    });
    expect(toAISDKDefaultOutput(undefined)).toEqual({
      type: "json",
      value: null,
    });
  });
});
