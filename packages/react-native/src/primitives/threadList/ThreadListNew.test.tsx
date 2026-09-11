import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ThreadListNew } from "./ThreadListNew";

const h = vi.hoisted(() => ({
  switchToNewThread: vi.fn<() => void>(),
  state: { threads: { newThreadId: "new", mainThreadId: "other" } },
  pressableProps: null as Record<string, unknown> | null,
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    useThreadListNew: () => ({ switchToNewThread: h.switchToNewThread }),
  };
});

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

describe("ThreadListNew", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.switchToNewThread.mockReset();
    h.state.threads = { newThreadId: "new", mainThreadId: "other" };
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
    props: Partial<Parameters<typeof ThreadListNew>[0]> = {},
  ) => {
    await act(async () => {
      root.render(
        <ThreadListNew testID="t" {...props}>
          new
        </ThreadListNew>,
      );
    });
    return container.querySelector('[data-testid="t"]') as HTMLElement;
  };

  const accessibilityState = () =>
    h.pressableProps?.["accessibilityState"] as
      | Record<string, unknown>
      | undefined;

  it("fires switchToNewThread when pressed", async () => {
    const el = await mount();

    await act(async () => {
      click(el);
    });

    expect(h.switchToNewThread).toHaveBeenCalledTimes(1);
  });

  it("does not fire when a disabled prop is passed through", async () => {
    const el = await mount({ disabled: true });

    await act(async () => {
      click(el);
    });

    expect(h.switchToNewThread).not.toHaveBeenCalled();
  });

  it("marks itself selected while the new thread is the current one", async () => {
    h.state.threads = { newThreadId: "new", mainThreadId: "new" };

    await mount();

    expect(accessibilityState()).toMatchObject({ selected: true });
  });

  it("is not selected while another thread is current", async () => {
    await mount();

    expect(accessibilityState()).toMatchObject({ selected: false });
  });

  it("keeps other accessibility state the caller passes", async () => {
    h.state.threads = { newThreadId: "new", mainThreadId: "new" };

    await mount({ accessibilityState: { busy: true } });

    expect(accessibilityState()).toMatchObject({ selected: true, busy: true });
  });

  it("lets the caller override the selected state", async () => {
    h.state.threads = { newThreadId: "new", mainThreadId: "new" };

    await mount({ accessibilityState: { selected: false } });

    expect(accessibilityState()).toMatchObject({ selected: false });
  });

  it("lets the caller select a control the state reports inactive", async () => {
    await mount({ accessibilityState: { selected: true } });

    expect(accessibilityState()).toMatchObject({ selected: true });
  });

  it("passes isActive alongside press state to render children", async () => {
    h.state.threads = { newThreadId: "new", mainThreadId: "new" };
    let renderState: unknown = null;

    await act(async () => {
      root.render(
        <ThreadListNew testID="t">
          {(state) => {
            renderState = state;
            return state.isActive ? "current" : "not current";
          }}
        </ThreadListNew>,
      );
    });

    const el = container.querySelector('[data-testid="t"]') as HTMLElement;
    expect(el.textContent).toBe("current");
    expect(renderState).toMatchObject({ pressed: false, isActive: true });
  });

  it("reports an inactive render state while another thread is current", async () => {
    let renderState: unknown = null;

    await act(async () => {
      root.render(
        <ThreadListNew testID="t">
          {(state) => {
            renderState = state;
            return state.isActive ? "current" : "not current";
          }}
        </ThreadListNew>,
      );
    });

    const el = container.querySelector('[data-testid="t"]') as HTMLElement;
    expect(el.textContent).toBe("not current");
    expect(renderState).toMatchObject({ pressed: false, isActive: false });
  });
});
