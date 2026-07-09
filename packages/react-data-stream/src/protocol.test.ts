import { describe, expect, it } from "vitest";
import { resolveDataStreamProtocol } from "./protocol";

describe("resolveDataStreamProtocol", () => {
  it("uses explicit protocol options", () => {
    const headers = new Headers({ "x-vercel-ai-data-stream": "v1" });

    expect(resolveDataStreamProtocol(headers, "ui-message-stream")).toEqual({
      protocol: "ui-message-stream",
      source: "explicit",
    });
    expect(resolveDataStreamProtocol(new Headers(), "data-stream")).toEqual({
      protocol: "data-stream",
      source: "explicit",
    });
  });

  it("detects legacy data stream responses from the Vercel AI header", () => {
    expect(
      resolveDataStreamProtocol(
        new Headers({ "x-vercel-ai-data-stream": " v1 " }),
      ),
    ).toEqual({
      protocol: "data-stream",
      source: "data-stream-header",
    });
  });

  it("detects UI message stream responses from the Vercel AI header", () => {
    expect(
      resolveDataStreamProtocol(
        new Headers({ "x-vercel-ai-ui-message-stream": " v1 " }),
      ),
    ).toEqual({
      protocol: "ui-message-stream",
      source: "ui-message-stream-header",
    });
  });

  it("prefers data stream when both protocol headers are present", () => {
    expect(
      resolveDataStreamProtocol(
        new Headers({
          "x-vercel-ai-data-stream": "v1",
          "x-vercel-ai-ui-message-stream": "v1",
        }),
      ),
    ).toEqual({
      protocol: "data-stream",
      source: "data-stream-header",
    });
  });

  it("falls back to ui-message-stream without a known protocol header", () => {
    expect(resolveDataStreamProtocol(new Headers())).toEqual({
      protocol: "ui-message-stream",
      source: "fallback",
    });
    expect(
      resolveDataStreamProtocol(
        new Headers({
          "x-vercel-ai-data-stream": "v2",
          "x-vercel-ai-ui-message-stream": "v2",
        }),
      ),
    ).toEqual({
      protocol: "ui-message-stream",
      source: "fallback",
    });
  });
});
