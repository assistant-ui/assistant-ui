import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AttachmentRemove } from "./AttachmentRemove";

const h = vi.hoisted(() => ({
  remove: vi.fn<() => void>(),
}));

vi.mock("@assistant-ui/store", () => {
  const aui = {
    attachment: () => ({ remove: h.remove }),
  };
  return {
    useAui: () => aui,
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("AttachmentRemove", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.remove.mockReset();
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
    props: Partial<Parameters<typeof AttachmentRemove>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <AttachmentRemove testID="remove" {...props}>
          x
        </AttachmentRemove>,
      );
    });
    return container.querySelector('[data-testid="remove"]') as HTMLElement;
  };

  const press = async (el: HTMLElement) => {
    await act(async () => {
      el.dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true }),
      );
    });
  };

  it("calls attachment().remove when pressed", async () => {
    const el = await mount();
    await press(el);
    expect(h.remove).toHaveBeenCalledTimes(1);
  });

  it("does not call remove before any press", async () => {
    await mount();
    expect(h.remove).not.toHaveBeenCalled();
  });

  it("renders its children", async () => {
    const el = await mount();
    expect(el.textContent).toBe("x");
  });

  it("does not fire remove when the Pressable is disabled", async () => {
    const el = await mount({ disabled: true });
    await press(el);
    expect(h.remove).not.toHaveBeenCalled();
  });
});
