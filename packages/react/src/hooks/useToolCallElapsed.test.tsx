import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { part } = vi.hoisted(() => ({
  part: {
    type: "tool-call" as const,
    status: { type: "running" as const },
    timing: { startedAt: 9000 },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAuiState: (
    selector: (state: { optional: { part: typeof part } }) => unknown,
  ) => selector({ optional: { part } }),
}));

import { useToolCallElapsed } from "./useToolCallElapsed";

describe("useToolCallElapsed", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("does not read the wall clock during server render", () => {
    const nowSpy = vi.spyOn(Date, "now");
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const Probe = () => <span>{useToolCallElapsed() ?? "none"}</span>;

    expect(renderToString(<Probe />)).toBe("<span>none</span>");
    expect(nowSpy).not.toHaveBeenCalled();
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(
      /useLayoutEffect does nothing on the server/,
    );
  });
});
