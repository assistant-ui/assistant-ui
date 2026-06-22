import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ComposerSend } from "./ComposerSend";

const h = vi.hoisted(() => ({
  send: vi.fn<() => void>(),
  disabled: false,
}));

vi.mock("@assistant-ui/core/react", () => ({
  useComposerSend: () => ({ send: h.send, disabled: h.disabled }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) => {
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("ComposerSend", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.send.mockReset();
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
    props: Partial<Parameters<typeof ComposerSend>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <ComposerSend testID="send" {...props}>
          send
        </ComposerSend>,
      );
    });
    const el = container.querySelector('[data-testid="send"]');
    expect(el).not.toBeNull();
    return el as Element;
  };

  it("renders its children", async () => {
    const el = await mount();
    expect(el.textContent).toBe("send");
  });

  it("calls send on press", async () => {
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.send).toHaveBeenCalledTimes(1);
  });

  it("does not press when the hook reports disabled", async () => {
    h.disabled = true;
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.send).not.toHaveBeenCalled();
  });

  it("lets a false prop override the hook's disabled:true", async () => {
    h.disabled = true;
    const el = await mount({ disabled: false });

    await act(async () => {
      click(el);
    });

    expect(h.send).toHaveBeenCalledTimes(1);
  });

  it("lets a true prop override the hook's disabled:false", async () => {
    h.disabled = false;
    const el = await mount({ disabled: true });

    await act(async () => {
      click(el);
    });

    expect(h.send).not.toHaveBeenCalled();
  });

  it("defers to the hook when disabled is undefined", async () => {
    h.disabled = false;
    const el = await mount({ disabled: undefined });

    await act(async () => {
      click(el);
    });

    expect(h.send).toHaveBeenCalledTimes(1);
  });
});
