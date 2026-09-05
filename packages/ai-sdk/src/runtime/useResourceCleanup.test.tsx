// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useResourceCleanup } from "./useResourceCleanup";

let currentSignal: AbortSignal | undefined;

vi.mock("@assistant-ui/store/internal", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useAssistantClientDestroySignal: () => currentSignal,
}));

describe("useResourceCleanup", () => {
  it("registers once per signal and only the active signal runs cleanup", () => {
    const a = new AbortController();
    const b = new AbortController();
    const cleanup = vi.fn();
    const Probe = () => {
      useResourceCleanup(true, cleanup);
      return null;
    };

    currentSignal = a.signal;
    const view = render(<Probe />);
    currentSignal = b.signal;
    view.rerender(<Probe />);
    currentSignal = a.signal;
    view.rerender(<Probe />);

    b.abort();
    expect(cleanup).not.toHaveBeenCalled();
    a.abort();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
