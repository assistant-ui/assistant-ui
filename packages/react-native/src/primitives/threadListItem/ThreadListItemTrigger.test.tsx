import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadListItemTrigger } from "./ThreadListItemTrigger";

const h = vi.hoisted(() => ({
  switchTo: vi.fn<() => void>(),
  state: {
    threads: { mainThreadId: "thread-1" },
    threadListItem: { id: "thread-1" },
  },
  pressableProps: null as Record<string, unknown> | null,
}));

vi.mock("@assistant-ui/core/react", () => ({
  useThreadListItemTrigger: () => ({ switchTo: h.switchTo }),
}));

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: <T,>(selector: (s: typeof h.state) => T) => selector(h.state),
  };
});

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const PressableMock = React.forwardRef(function PressableMock(
    props: Record<string, unknown>,
    ref: React.Ref<unknown>,
  ) {
    h.pressableProps = props;
    return React.createElement(
      actual.Pressable as unknown as React.ElementType,
      { ...props, ref },
    );
  });
  return { ...actual, Pressable: PressableMock };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

const click = (el: Element) =>
  el.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );

describe("ThreadListItemTrigger", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.switchTo.mockReset();
    h.state.threads.mainThreadId = "thread-1";
    h.state.threadListItem.id = "thread-1";
    h.pressableProps = null;

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
    props: Partial<Parameters<typeof ThreadListItemTrigger>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <ThreadListItemTrigger testID="t" {...props}>
          open
        </ThreadListItemTrigger>,
      );
    });
    return container.querySelector('[data-testid="t"]') as HTMLElement;
  };

  const accessibilityState = () =>
    h.pressableProps?.["accessibilityState"] as
      | Record<string, unknown>
      | undefined;

  it("fires switchTo when pressed", async () => {
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.switchTo).toHaveBeenCalledTimes(1);
  });

  it("does not fire when a disabled prop is passed through", async () => {
    const el = await mount({ disabled: true });

    await act(async () => {
      click(el);
    });

    expect(h.switchTo).not.toHaveBeenCalled();
  });

  it("marks the current thread selected", async () => {
    await mount();

    expect(accessibilityState()).toMatchObject({ selected: true });
  });

  it("does not mark another thread selected", async () => {
    h.state.threads.mainThreadId = "thread-2";

    await mount();

    expect(accessibilityState()).toMatchObject({ selected: false });
  });

  it("keeps caller accessibility state overrides", async () => {
    await mount({ accessibilityState: { busy: true, selected: false } });

    expect(accessibilityState()).toMatchObject({ busy: true, selected: false });
  });

  it("passes active state alongside the Pressable state", async () => {
    let renderState: unknown = null;

    await act(async () => {
      root.render(
        <ThreadListItemTrigger testID="t">
          {(state) => {
            renderState = state;
            return "item";
          }}
        </ThreadListItemTrigger>,
      );
    });

    expect(renderState).toMatchObject({ pressed: false, isActive: true });
  });
});
