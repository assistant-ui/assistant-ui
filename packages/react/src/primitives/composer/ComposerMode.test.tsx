/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerPrimitiveMode } from "./ComposerMode";

const setMode = vi.fn<(mode: string | undefined) => void>();

const composerState = {
  mode: "plan" as string | undefined,
};

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("@assistant-ui/store", () => {
  const aui = {
    composer: () => ({ setMode }),
  };
  type Selector<T> = (s: { composer: typeof composerState }) => T;
  return {
    useAui: () => aui,
    useAuiState: <T,>(selector: Selector<T>) =>
      selector({ composer: composerState }),
  };
});

describe("ComposerPrimitive.Mode", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    setMode.mockClear();
    composerState.mode = "plan";
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it("marks the active mode and calls setMode on click", () => {
    act(() => {
      root.render(
        <>
          <ComposerPrimitiveMode value="plan">Plan</ComposerPrimitiveMode>
          <ComposerPrimitiveMode value="debug">Debug</ComposerPrimitiveMode>
        </>,
      );
    });

    const buttons = container.querySelectorAll("button");
    const planBtn = buttons[0]!;
    const debugBtn = buttons[1]!;

    expect(planBtn.getAttribute("data-active")).toBe("true");
    expect(debugBtn.getAttribute("data-active")).toBeNull();
    expect(planBtn.getAttribute("aria-pressed")).toBe("true");
    expect(debugBtn.getAttribute("aria-pressed")).toBe("false");

    act(() => {
      debugBtn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(setMode).toHaveBeenCalledWith("debug");
  });
});
