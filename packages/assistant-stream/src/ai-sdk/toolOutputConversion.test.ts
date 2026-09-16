import { describe, expect, it } from "vitest";
import type { ToolModelContentPart } from "../core/tool/tool-types";
import { toAISDKContent } from "./toolOutputConversion";

const parts: ToolModelContentPart[] = [
  { type: "text", text: "PDF contents:" },
  {
    type: "file",
    data: "JVBERi0xLjQK",
    mediaType: "application/pdf",
    filename: "doc.pdf",
  },
];

describe("toAISDKContent", () => {
  it("emits the ai@7 tagged `file` part when tagged file data is enabled", () => {
    expect(toAISDKContent(parts, { taggedFileData: true })).toEqual({
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

  it("emits the ai@6 `file-data` part when tagged file data is disabled", () => {
    expect(toAISDKContent(parts, { taggedFileData: false })).toEqual({
      type: "content",
      value: [
        { type: "text", text: "PDF contents:" },
        {
          type: "file-data",
          data: "JVBERi0xLjQK",
          mediaType: "application/pdf",
          filename: "doc.pdf",
        },
      ],
    });
  });
});
