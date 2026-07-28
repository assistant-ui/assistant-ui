// @vitest-environment jsdom
// repro: proves the browser page survives the parts shrink — the shrink
// arrives from outside React's call stack (setTimeout, standing in for an SSE
// event) and the flushSync render of each stale part leaf reads its
// render-bound part instance (stale but consistent) instead of throwing; the
// parent's reconciliation then unmounts the leaves cleanly.
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ReproPartIndexCrash,
  reproHarness,
  shrinkParts,
} from "./repro-part-index-crash";

afterEach(() => {
  cleanup();
  reproHarness.runtime = null;
  reproHarness.renderLog = [];
  vi.restoreAllMocks();
});

describe("repro: stale part-index shrink", () => {
  it("renders bound content in the stale leaves and unmounts them cleanly", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const windowErrors: unknown[] = [];
    const onError = (e: ErrorEvent) => {
      windowErrors.push(e.error);
      e.preventDefault();
    };
    window.addEventListener("error", onError);

    try {
      let view!: ReturnType<typeof render>;
      await act(async () => {
        view = render(<ReproPartIndexCrash />);
      });
      await waitFor(() => expect(view.getAllByTestId("part")).toHaveLength(3));

      reproHarness.renderLog = [];

      // Same call the button schedules via setTimeout — invoked here directly
      // so it runs outside React's call stack, deterministically.
      shrinkParts(reproHarness.runtime!);
      await new Promise((r) => setTimeout(r, 20));

      expect(windowErrors).toEqual([]);
      // The flushSync subscribers re-rendered the stale leaves alone; every
      // render read the leaf's bound instance, not a live index lookup.
      expect(reproHarness.renderLog.length).toBeGreaterThan(0);
      expect(
        reproHarness.renderLog.every((text) =>
          ["part one", "part two", "part three"].includes(text),
        ),
      ).toBe(true);
      await waitFor(() =>
        expect(view.queryAllByTestId("part")).toHaveLength(0),
      );
      const flushSyncWarnings = consoleError.mock.calls.filter((args) =>
        String(args[0]).includes(
          "flushSync was called from inside a lifecycle",
        ),
      );
      expect(flushSyncWarnings).toHaveLength(0);
    } finally {
      window.removeEventListener("error", onError);
    }
  });
});
