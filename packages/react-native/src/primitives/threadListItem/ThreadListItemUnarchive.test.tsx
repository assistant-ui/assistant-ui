import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadListItemUnarchive } from "./ThreadListItemUnarchive";

const h = vi.hoisted(() => ({
  unarchive: vi.fn<() => void>(),
  disabled: false,
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useThreadListItemUnarchive: () => ({
    unarchive: h.unarchive,
    disabled: h.disabled,
  }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) =>
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );

describe("ThreadListItemUnarchive", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.unarchive.mockReset();
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
    props: Partial<Parameters<typeof ThreadListItemUnarchive>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <ThreadListItemUnarchive testID="t" {...props}>
          unarchive
        </ThreadListItemUnarchive>,
      );
    });
    return container.querySelector('[data-testid="t"]') as HTMLElement;
  };

  it("fires unarchive when pressed", async () => {
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.unarchive).toHaveBeenCalledTimes(1);
  });

  it("cannot enable an unsupported action with disabled=false", async () => {
    h.disabled = true;
    const el = await mount({ disabled: false });
    expect(el.getAttribute("aria-disabled")).toBe("true");
    await act(async () => {
      click(el);
    });
    expect(h.unarchive).not.toHaveBeenCalled();
  });

  it("does not fire when a disabled prop is passed through", async () => {
    const el = await mount({ disabled: true });

    await act(async () => {
      click(el);
    });

    expect(h.unarchive).not.toHaveBeenCalled();
  });
});
