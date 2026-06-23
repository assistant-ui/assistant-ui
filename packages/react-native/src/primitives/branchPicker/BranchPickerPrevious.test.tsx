import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BranchPickerPrevious } from "./BranchPickerPrevious";

const h = vi.hoisted(() => ({
  previous: vi.fn<() => void>(),
  state: { disabled: false },
}));

vi.mock("@assistant-ui/core/react", () => ({
  useBranchPickerPrevious: () => ({
    previous: h.previous,
    disabled: h.state.disabled,
  }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) =>
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );

describe("BranchPickerPrevious", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.previous.mockReset();
    h.state.disabled = false;

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const mount = async (
    props: Partial<Parameters<typeof BranchPickerPrevious>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <BranchPickerPrevious testID="t" {...props}>
          prev
        </BranchPickerPrevious>,
      );
    });
    return container.querySelector('[data-testid="t"]') as HTMLElement;
  };

  it("fires previous when pressed and the hook is enabled", async () => {
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.previous).toHaveBeenCalledTimes(1);
  });

  it("does not fire previous when the hook reports disabled", async () => {
    h.state.disabled = true;
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.previous).not.toHaveBeenCalled();
  });

  it("lets an explicit disabled prop override an enabled hook", async () => {
    h.state.disabled = false;
    const el = await mount({ disabled: true });

    await act(async () => {
      click(el);
    });

    expect(h.previous).not.toHaveBeenCalled();
  });

  it("lets an explicit disabled={false} prop override a disabled hook", async () => {
    h.state.disabled = true;
    const el = await mount({ disabled: false });

    await act(async () => {
      click(el);
    });

    expect(h.previous).toHaveBeenCalledTimes(1);
  });
});
