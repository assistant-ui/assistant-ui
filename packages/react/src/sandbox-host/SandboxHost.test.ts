// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { isSandboxFrameMessage } from "./SandboxHost";

function makeFrame() {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  return { iframe, origin: "https://app.example" };
}

describe("isSandboxFrameMessage", () => {
  it("accepts a message from the frame's contentWindow at its origin", () => {
    const frame = makeFrame();
    const event = new MessageEvent("message", {
      data: { jsonrpc: "2.0", method: "x" },
      origin: frame.origin,
      source: frame.iframe.contentWindow,
    });
    expect(isSandboxFrameMessage(event, frame)).toBe(true);
  });

  it("rejects a message from a different origin", () => {
    const frame = makeFrame();
    const event = new MessageEvent("message", {
      data: { jsonrpc: "2.0", method: "x" },
      origin: "https://attacker.example",
      source: frame.iframe.contentWindow,
    });
    expect(isSandboxFrameMessage(event, frame)).toBe(false);
  });

  it("rejects a message from a different source window", () => {
    const frame = makeFrame();
    const event = new MessageEvent("message", {
      data: { jsonrpc: "2.0", method: "x" },
      origin: frame.origin,
      source: window,
    });
    expect(isSandboxFrameMessage(event, frame)).toBe(false);
  });
});
