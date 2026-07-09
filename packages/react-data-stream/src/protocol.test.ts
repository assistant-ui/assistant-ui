import { describe, expect, it } from "vitest";
import { resolveDataStreamProtocol } from "./protocol";

describe("resolveDataStreamProtocol", () => {
  it("uses explicit protocol options", () => {
    const headers = new Headers({ "x-vercel-ai-data-stream": "v1" });

    expect(resolveDataStreamProtocol(headers, "ui-message-stream")).toBe(
      "ui-message-stream",
    );
    expect(resolveDataStreamProtocol(new Headers(), "data-stream")).toBe(
      "data-stream",
    );
  });

  it("detects legacy data stream responses from the Vercel AI header", () => {
    expect(
      resolveDataStreamProtocol(
        new Headers({ "x-vercel-ai-data-stream": " v1 " }),
      ),
    ).toBe("data-stream");
  });

  it("detects UI message stream responses from the Vercel AI header", () => {
    expect(
      resolveDataStreamProtocol(
        new Headers({ "x-vercel-ai-ui-message-stream": " v1 " }),
      ),
    ).toBe("ui-message-stream");
  });

  it("prefers data stream when both protocol headers are present", () => {
    expect(
      resolveDataStreamProtocol(
        new Headers({
          "x-vercel-ai-data-stream": "v1",
          "x-vercel-ai-ui-message-stream": "v1",
        }),
      ),
    ).toBe("data-stream");
  });

  it("falls back to ui-message-stream without a known protocol header", () => {
    expect(resolveDataStreamProtocol(new Headers())).toBe("ui-message-stream");
    expect(
      resolveDataStreamProtocol(
        new Headers({ "x-vercel-ai-data-stream": "v2" }),
      ),
    ).toBe("ui-message-stream");
  });
});
