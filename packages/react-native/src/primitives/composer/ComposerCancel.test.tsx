import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerCancel } from "./ComposerCancel";

const h = vi.hoisted(() => ({
  cancel: vi.fn<() => void>(),
  disabled: false,
}));

vi.mock("@assistant-ui/core/react", () => ({
  useComposerCancel: () => ({ cancel: h.cancel, disabled: h.disabled }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) => {
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("ComposerCancel", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.cancel.mockReset();
    h.disabled = false;

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
    props: Partial<Parameters<typeof ComposerCancel>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <ComposerCancel testID="cancel" {...props}>
          cancel
        </ComposerCancel>,
      );
    });
    const el = container.querySelector('[data-testid="cancel"]');
    expect(el).not.toBeNull();
    return el as Element;
  };

  it("renders its children", async () => {
    const el = await mount();
    expect(el.textContent).toBe("cancel");
  });

  it("calls cancel on press", async () => {
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.cancel).toHaveBeenCalledTimes(1);
  });

  it("does not press when the hook reports disabled", async () => {
    h.disabled = true;
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.cancel).not.toHaveBeenCalled();
  });

  it("lets a false prop override the hook's disabled:true", async () => {
    h.disabled = true;
    const el = await mount({ disabled: false });

    await act(async () => {
      click(el);
    });

    expect(h.cancel).toHaveBeenCalledTimes(1);
  });

  it("lets a true prop override the hook's disabled:false", async () => {
    h.disabled = false;
    const el = await mount({ disabled: true });

    await act(async () => {
      click(el);
    });

    expect(h.cancel).not.toHaveBeenCalled();
  });

  it("defers to the hook when disabled is undefined", async () => {
    h.disabled = false;
    const el = await mount({ disabled: undefined });

    await act(async () => {
      click(el);
    });

    expect(h.cancel).toHaveBeenCalledTimes(1);
  });
});
