// @vitest-environment jsdom

import { Activity } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareButton } from "./share-button";

const isCopied = (container: HTMLElement) =>
  container.querySelector("button")?.title === "Link copied to clipboard";

const share = async (container: HTMLElement) => {
  await act(async () => {
    container.querySelector("button")!.click();
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("navigator", {
    ...navigator,
    clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ShareButton", () => {
  it("keeps the confirmation for the full window after sharing again", async () => {
    const { container } = render(<ShareButton />);

    await share(container);
    expect(isCopied(container)).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1200);
    });
    await share(container);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1999);
    });
    expect(isCopied(container)).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(isCopied(container)).toBe(false);
  });

  it("clears its timer on unmount", async () => {
    const view = render(<ShareButton />);

    await share(view.container);
    expect(vi.getTimerCount()).toBe(1);

    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets the confirmation when a hidden Activity cancels its timer", async () => {
    const App = ({ mode }: { mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <ShareButton />
      </Activity>
    );
    const view = render(<App mode="visible" />);

    await share(view.container);
    expect(isCopied(view.container)).toBe(true);

    view.rerender(<App mode="hidden" />);
    view.rerender(<App mode="visible" />);

    expect(isCopied(view.container)).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
});
