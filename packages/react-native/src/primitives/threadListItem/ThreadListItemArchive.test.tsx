import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadListItemArchive } from "./ThreadListItemArchive";

const h = vi.hoisted(() => ({
  archive: vi.fn<() => void>(),
}));

vi.mock("@assistant-ui/core/react", () => ({
  useThreadListItemArchive: () => ({ archive: h.archive }),
}));

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) =>
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );

describe("ThreadListItemArchive", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.archive.mockReset();

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
    props: Partial<Parameters<typeof ThreadListItemArchive>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <ThreadListItemArchive testID="t" {...props}>
          archive
        </ThreadListItemArchive>,
      );
    });
    return container.querySelector('[data-testid="t"]') as HTMLElement;
  };

  it("fires archive when pressed", async () => {
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.archive).toHaveBeenCalledTimes(1);
  });

  it("does not fire when a disabled prop is passed through", async () => {
    const el = await mount({ disabled: true });

    await act(async () => {
      click(el);
    });

    expect(h.archive).not.toHaveBeenCalled();
  });
});
