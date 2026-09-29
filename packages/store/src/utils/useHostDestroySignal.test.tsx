// @vitest-environment jsdom

import { Activity, StrictMode, Suspense, useState } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useHostDestroySignal } from "./useHostDestroySignal";

let consoleErrors: ReturnType<typeof vi.spyOn> | undefined;

afterEach(() => {
  cleanup();
  consoleErrors?.mockRestore();
  consoleErrors = undefined;
});

const nextTask = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("useHostDestroySignal", () => {
  let signal: AbortSignal;
  const Probe = () => {
    signal = useHostDestroySignal();
    return null;
  };

  it("does not abort across a Strict Mode double mount", async () => {
    render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    const captured = signal;

    await nextTask();
    expect(captured.aborted).toBe(false);
  });

  it("stays armed while an Activity is hidden and aborts when the hidden host unmounts", async () => {
    const App = ({ mode }: { mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <Probe />
      </Activity>
    );
    const view = render(<App mode="visible" />);
    const captured = signal;

    view.rerender(<App mode="hidden" />);
    await act(nextTask);
    expect(captured.aborted).toBe(false);

    view.rerender(<App mode="visible" />);
    expect(signal).toBe(captured);
    expect(captured.aborted).toBe(false);

    await act(async () => {
      view.rerender(<App mode="hidden" />);
    });
    await act(nextTask);
    expect(captured.aborted).toBe(false);

    view.unmount();
    expect(captured.aborted).toBe(false);
    await act(async () => {});
    expect(captured.aborted).toBe(true);
  });

  it("lets an abort listener update a surviving component", async () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleErrors = errors;
    let bump: (() => void) | undefined;
    const Sibling = () => {
      const [, set] = useState(0);
      bump = () => set((n) => n + 1);
      return null;
    };
    const Shell = ({ mounted }: { mounted: boolean }) => (
      <>
        <Sibling />
        {mounted && <Probe />}
      </>
    );

    const view = render(<Shell mounted={true} />);
    const captured = signal;
    captured.addEventListener("abort", () => bump?.());

    await act(async () => view.rerender(<Shell mounted={false} />));
    expect(captured.aborted).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it("stays armed while a sibling keeps the boundary re-suspended", async () => {
    const never = new Promise<void>(() => {});
    const Sibling = ({ suspended }: { suspended: boolean }) => {
      if (suspended) throw never;
      return null;
    };
    let setSuspended: ((suspended: boolean) => void) | undefined;
    const Shell = () => {
      const [suspended, set] = useState(false);
      setSuspended = set;
      return (
        <Suspense fallback={null}>
          <Probe />
          <Sibling suspended={suspended} />
        </Suspense>
      );
    };

    const view = render(<Shell />);
    const captured = signal;

    act(() => setSuspended?.(true));
    await act(nextTask);
    expect(captured.aborted).toBe(false);

    act(() => setSuspended?.(false));
    expect(signal).toBe(captured);
    expect(captured.aborted).toBe(false);

    view.unmount();
    await act(async () => {});
    expect(captured.aborted).toBe(true);
  });
});
