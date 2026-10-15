import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text, View } from "react-native";
import type { ThreadListItemPrimitive } from "../../index";
import { Title as ThreadListItemTitle } from "../threadListItem";

const fallbackProps: ThreadListItemPrimitive.Title.Props = {
  fallback: "New chat",
};

const h = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  let state = { threadListItem: { title: undefined as string | undefined } };
  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setTitle: (title: string | undefined) => {
      state = { threadListItem: { title } };
      listeners.forEach((listener) => listener());
    },
    textChildren: [] as unknown[],
    textProps: null as Record<string, unknown> | null,
  };
});

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  const { useSyncExternalStore } = await import("react");
  return {
    ...actual,
    useAuiState: <T,>(selector: (s: ReturnType<typeof h.getState>) => T) =>
      selector(useSyncExternalStore(h.subscribe, h.getState)),
  };
});

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const TextMock = (props: Record<string, unknown>) => {
    h.textChildren.push(props.children);
    h.textProps = props;
    return React.createElement(
      actual.Text as unknown as React.ElementType,
      props,
    );
  };
  return { ...actual, Text: TextMock };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("ThreadListItemTitle", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.setTitle(undefined);
    h.textChildren = [];
    h.textProps = null;
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

  it("renders the title through react-native Text", async () => {
    h.setTitle("My thread");

    await act(async () => {
      root.render(<ThreadListItemTitle />);
    });

    expect(h.textChildren).toEqual(["My thread"]);
    expect(container.textContent).toBe("My thread");
  });

  it("forwards host Text props the public type exposes", async () => {
    h.setTitle("My thread");

    await act(async () => {
      root.render(<ThreadListItemTitle numberOfLines={1} testID="title" />);
    });

    expect(h.textProps).toMatchObject({ numberOfLines: 1, testID: "title" });
  });

  it("renders a nested Text fallback the ReactNode contract permits", async () => {
    await act(async () => {
      root.render(
        <ThreadListItemTitle fallback={<Text>Untitled chat</Text>} />,
      );
    });

    expect(container.textContent).toBe("Untitled chat");
  });

  it("renders nothing without a title or fallback", async () => {
    await act(async () => {
      root.render(<ThreadListItemTitle numberOfLines={1} />);
    });

    expect(h.textChildren).toEqual([]);
    expect(container.innerHTML).toBe("");
  });

  it("renders an element fallback outside Text", async () => {
    await act(async () => {
      root.render(
        <ThreadListItemTitle fallback={<View testID="fallback-view" />} />,
      );
    });

    expect(h.textChildren).toEqual([]);
    expect(
      container.querySelector('[data-testid="fallback-view"]'),
    ).not.toBeNull();
  });

  it("renders the fallback through Text when there is no title", async () => {
    await act(async () => {
      root.render(<ThreadListItemTitle {...fallbackProps} />);
    });

    expect(h.textChildren).toEqual(["New chat"]);
    expect(container.textContent).toBe("New chat");
  });

  it("renders an empty title with the fallback", async () => {
    h.setTitle("");

    await act(async () => {
      root.render(<ThreadListItemTitle {...fallbackProps} />);
    });

    expect(container.textContent).toBe("New chat");
  });

  it("updates the title while mounted", async () => {
    await act(async () => {
      root.render(<ThreadListItemTitle {...fallbackProps} />);
    });
    expect(container.textContent).toBe("New chat");

    await act(async () => {
      h.setTitle("First title");
    });
    expect(container.textContent).toBe("First title");

    await act(async () => {
      h.setTitle("Updated title");
    });
    expect(container.textContent).toBe("Updated title");
  });
});
