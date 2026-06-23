import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerAddAttachment } from "./ComposerAddAttachment";

const h = vi.hoisted(() => ({
  disabled: false,
}));

vi.mock("@assistant-ui/core/react", () => ({
  useComposerAddAttachment: () => ({ disabled: h.disabled }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) => {
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("ComposerAddAttachment", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
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
    props: Partial<Parameters<typeof ComposerAddAttachment>[0]> & {
      onPress?: () => void;
    } = {},
  ) => {
    await act(async () => {
      root.render(
        <ComposerAddAttachment testID="add" {...props}>
          add
        </ComposerAddAttachment>,
      );
    });
    const el = container.querySelector('[data-testid="add"]');
    expect(el).not.toBeNull();
    return el as Element;
  };

  it("renders its children", async () => {
    const el = await mount();
    expect(el.textContent).toBe("add");
  });

  it("wires no onPress so pressing is a no-op", async () => {
    const el = await mount();

    let threw = false;
    await act(async () => {
      try {
        click(el);
      } catch {
        threw = true;
      }
    });

    expect(threw).toBe(false);
  });

  it("forwards an explicit onPress prop", async () => {
    const onPress = vi.fn();
    const el = await mount({ onPress });

    await act(async () => {
      click(el);
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("blocks a forwarded onPress when the hook reports disabled", async () => {
    h.disabled = true;
    const onPress = vi.fn();
    const el = await mount({ onPress });

    await act(async () => {
      click(el);
    });

    expect(onPress).not.toHaveBeenCalled();
  });

  it("lets a false prop override the hook's disabled:true", async () => {
    h.disabled = true;
    const onPress = vi.fn();
    const el = await mount({ disabled: false, onPress });

    await act(async () => {
      click(el);
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("lets a true prop override the hook's disabled:false", async () => {
    h.disabled = false;
    const onPress = vi.fn();
    const el = await mount({ disabled: true, onPress });

    await act(async () => {
      click(el);
    });

    expect(onPress).not.toHaveBeenCalled();
  });

  it("defers to the hook when disabled is undefined", async () => {
    h.disabled = false;
    const onPress = vi.fn();
    const el = await mount({ disabled: undefined, onPress });

    await act(async () => {
      click(el);
    });

    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
