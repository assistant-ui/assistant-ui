import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Text } from "react-native";
import { ThreadListItemTitle } from "./ThreadListItemTitle";

const h = vi.hoisted(() => ({
  state: { threadListItem: { title: undefined as string | undefined } },
  textChildren: [] as unknown[],
  textProps: null as Record<string, unknown> | null,
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
    h.state.threadListItem.title = undefined;
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

  // React Native rejects a raw string outside a Text, so the title has to reach
  // the host through react-native's own Text element.
  it("renders the title through react-native Text", async () => {
    h.state.threadListItem.title = "My thread";

    await act(async () => {
      root.render(<ThreadListItemTitle />);
    });

    expect(h.textChildren).toEqual(["My thread"]);
    expect(container.textContent).toBe("My thread");
  });

  it("forwards host Text props the public type exposes", async () => {
    h.state.threadListItem.title = "My thread";

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

  it("renders the fallback through Text when there is no title", async () => {
    await act(async () => {
      root.render(<ThreadListItemTitle fallback="New chat" />);
    });

    expect(h.textChildren).toEqual(["New chat"]);
    expect(container.textContent).toBe("New chat");
  });
});
