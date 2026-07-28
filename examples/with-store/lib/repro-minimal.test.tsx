// @vitest-environment jsdom
// repro: proves the minimal tap+store page survives the stale-index shrink —
// the shrink arrives from outside React's call stack and the flushSync render
// of each stale leaf reads its render-bound item instance (stale but
// consistent) instead of throwing; the parent's reconciliation then unmounts
// the leaves cleanly.
import { act, cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReproMinimal, reproMinimalHarness } from "./repro-minimal";

afterEach(() => {
  cleanup();
  reproMinimalHarness.clear = null;
  reproMinimalHarness.renderLog = [];
  vi.restoreAllMocks();
});

describe("repro: minimal stale-index shrink (tap + store only)", () => {
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
        view = render(<ReproMinimal />);
      });
      await waitFor(() => expect(view.getAllByTestId("item")).toHaveLength(3));

      reproMinimalHarness.renderLog = [];

      // Same call the button schedules via setTimeout — invoked here directly
      // so it runs outside React's call stack, deterministically.
      reproMinimalHarness.clear!();
      await new Promise((r) => setTimeout(r, 20));

      expect(windowErrors).toEqual([]);
      // The flushSync subscribers re-rendered the stale leaves alone; every
      // render read the leaf's bound instance, not a live index lookup.
      expect(reproMinimalHarness.renderLog.length).toBeGreaterThan(0);
      expect(
        reproMinimalHarness.renderLog.every((id) =>
          ["a", "b", "c"].includes(id),
        ),
      ).toBe(true);
      await waitFor(() =>
        expect(view.queryAllByTestId("item")).toHaveLength(0),
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
