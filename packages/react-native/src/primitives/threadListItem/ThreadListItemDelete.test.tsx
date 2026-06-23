import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadListItemDelete } from "./ThreadListItemDelete";

const h = vi.hoisted(() => ({
  deleteThread: vi.fn<() => void>(),
}));

vi.mock("@assistant-ui/core/react", () => ({
  useThreadListItemDelete: () => ({ delete: h.deleteThread }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) =>
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );

describe("ThreadListItemDelete", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.deleteThread.mockReset();

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
    props: Partial<Parameters<typeof ThreadListItemDelete>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <ThreadListItemDelete testID="t" {...props}>
          delete
        </ThreadListItemDelete>,
      );
    });
    return container.querySelector('[data-testid="t"]') as HTMLElement;
  };

  it("fires the bound delete when pressed", async () => {
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.deleteThread).toHaveBeenCalledTimes(1);
  });

  it("does not fire when a disabled prop is passed through", async () => {
    const el = await mount({ disabled: true });

    await act(async () => {
      click(el);
    });

    expect(h.deleteThread).not.toHaveBeenCalled();
  });
});
