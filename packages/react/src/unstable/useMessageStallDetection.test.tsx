// @vitest-environment jsdom

import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { message } = vi.hoisted(() => ({
  message: {
    status: { type: "running" as const },
    content: [{ type: "text" as const, text: "streaming" }],
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: (selector: (state: { message: typeof message }) => unknown) =>
    selector({ message }),
}));

vi.mock("@assistant-ui/store/internal", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store/internal")>()),
  useShallowSelector: <T,>(selector: T) => selector,
}));

import { unstable_useMessageStallDetection } from "./useMessageStallDetection";

describe("unstable_useMessageStallDetection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not read the wall clock during server render", () => {
    const nowSpy = vi.spyOn(Date, "now");
    const Probe = () => (
      <span>{String(unstable_useMessageStallDetection().stalled)}</span>
    );

    expect(renderToString(<Probe />)).toBe("<span>false</span>");
    expect(nowSpy).not.toHaveBeenCalled();
  });
});
