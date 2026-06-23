import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BranchPickerNext } from "./BranchPickerNext";

const h = vi.hoisted(() => ({
  next: vi.fn<() => void>(),
  state: { disabled: false },
}));

vi.mock("@assistant-ui/core/react", () => ({
  useBranchPickerNext: () => ({ next: h.next, disabled: h.state.disabled }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) =>
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );

describe("BranchPickerNext", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.next.mockReset();
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
    props: Partial<Parameters<typeof BranchPickerNext>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <BranchPickerNext testID="t" {...props}>
          next
        </BranchPickerNext>,
      );
    });
    return container.querySelector('[data-testid="t"]') as HTMLElement;
  };

  it("fires next when pressed and the hook is enabled", async () => {
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.next).toHaveBeenCalledTimes(1);
  });

  it("does not fire next when the hook reports disabled", async () => {
    h.state.disabled = true;
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.next).not.toHaveBeenCalled();
  });

  it("lets an explicit disabled prop override an enabled hook", async () => {
    h.state.disabled = false;
    const el = await mount({ disabled: true });

    await act(async () => {
      click(el);
    });

    expect(h.next).not.toHaveBeenCalled();
  });

  it("lets an explicit disabled={false} prop override a disabled hook", async () => {
    h.state.disabled = true;
    const el = await mount({ disabled: false });

    await act(async () => {
      click(el);
    });

    expect(h.next).toHaveBeenCalledTimes(1);
  });
});
