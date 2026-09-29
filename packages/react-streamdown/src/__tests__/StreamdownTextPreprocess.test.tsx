import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  messagePartText: {
    type: "text",
    text: "",
    status: { type: "running" },
  } as { type: string; text: string; status: { type: string } },
  smooth: vi.fn((part: { text: string }, _smooth?: unknown) => part),
}));

vi.mock("@assistant-ui/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/react")>();
  return {
    ...actual,
    useMessagePartText: () => mocks.messagePartText,
    useSmooth: (part: { text: string }, smooth: unknown) =>
      mocks.smooth(part, smooth as never),
  };
});

import { StreamdownTextPrimitive } from "../primitives/StreamdownText";
import { normalizeMathDelimiters } from "../preprocess";

Element.prototype.scrollTo ??= function scrollTo() {};

afterEach(cleanup);

describe("StreamdownTextPrimitive preprocess wiring", () => {
  const streamed = String.raw`Consider \[ a^2+b^2=c^2 \] and more`;
  // the closing bracket has arrived but the trailing prose has not
  const revealed = String.raw`Consider \[ a^2+b^2=c^2 \]`;

  it("smooths the raw text and preprocesses only what has been revealed", () => {
    mocks.messagePartText = {
      type: "text",
      text: streamed,
      status: { type: "running" },
    };
    mocks.smooth.mockImplementation((part) => ({ ...part, text: revealed }));

    const { container } = render(
      <StreamdownTextPrimitive smooth preprocess={normalizeMathDelimiters} />,
    );

    // smoothing has to see the raw accumulated text, otherwise a rewrite of
    // already-revealed characters reads as a discontinuity and restarts it
    expect(mocks.smooth).toHaveBeenCalledWith(
      expect.objectContaining({ text: streamed }),
      expect.anything(),
    );
    expect(container.textContent).toContain("$$a^2+b^2=c^2$$");
    expect(container.textContent).not.toContain("and more");
  });

  it("preprocesses the whole message once it is fully revealed", () => {
    mocks.messagePartText = {
      type: "text",
      text: streamed,
      status: { type: "complete" },
    };
    mocks.smooth.mockImplementation((part) => part);

    const { container } = render(
      <StreamdownTextPrimitive smooth preprocess={normalizeMathDelimiters} />,
    );

    expect(container.textContent).toContain("$$a^2+b^2=c^2$$");
    expect(container.textContent).toContain("and more");
  });
});
