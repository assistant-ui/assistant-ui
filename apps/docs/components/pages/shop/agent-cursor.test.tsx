// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { AgentCursor } from "../../../../../packages/ui/src/components/react/ui/base/agent-cursor";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

it("tracks a stable ref when its DOM target mounts and is replaced", () => {
  let tick: FrameRequestCallback | undefined;
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = observe;
      disconnect = disconnect;
    },
  );
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    tick = callback;
    return 1;
  });
  const cancel = vi.fn();
  vi.stubGlobal("cancelAnimationFrame", cancel);
  const target = { current: null as HTMLElement | null };
  const { container, unmount } = render(<AgentCursor target={target} />);
  const cursor = container.querySelector<HTMLElement>(
    '[data-slot="agent-cursor"]',
  )!;
  expect(cursor.style.opacity).toBe("0");
  const first = document.createElement("button");
  document.body.append(first);
  first.getBoundingClientRect = () =>
    ({ left: 10, top: 20, width: 100, height: 40 }) as DOMRect;
  target.current = first;
  tick!(0);
  expect(observe).toHaveBeenLastCalledWith(first);
  expect(cursor.style.getPropertyValue("--aui-cursor-x")).toBe("60px");
  expect(cursor.style.opacity).toBe("1");
  const next = document.createElement("button");
  document.body.append(next);
  next.getBoundingClientRect = () =>
    ({ left: 200, top: 80, width: 40, height: 20 }) as DOMRect;
  first.remove();
  target.current = next;
  tick!(1);
  expect(observe).toHaveBeenLastCalledWith(next);
  expect(cursor.style.getPropertyValue("--aui-cursor-x")).toBe("220px");
  target.current = null;
  tick!(2);
  expect(cursor.style.opacity).toBe("0");
  unmount();
  expect(cancel).toHaveBeenCalledWith(1);
  expect(disconnect).toHaveBeenCalled();
  next.remove();
});
