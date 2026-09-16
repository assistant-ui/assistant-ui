import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Text } from "react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReasoningGroup } from "./reasoning.aui";

const h = vi.hoisted(() => ({
  state: {
    message: {
      status: { type: "running" },
      parts: [
        { type: "reasoning", status: { type: "complete" } },
        { type: "reasoning", status: { type: "running" } },
      ],
    },
  },
}));

vi.mock("@assistant-ui/react-native", () => ({
  useAuiState: <T,>(selector: (state: typeof h.state) => T) =>
    selector(h.state),
}));

vi.mock("./markdown-text", () => ({ MarkdownText: () => null }));

vi.mock("uniwind", () => ({
  withUniwind: (Component: unknown) => Component,
  useCSSVariable: (names: string | string[]) =>
    Array.isArray(names) ? names.map(() => undefined) : undefined,
  useUniwind: () => ({ theme: "light" }),
}));

vi.mock("lucide-react-native", async () => {
  const React = await import("react");
  const { View } = await import("react-native");
  const icon = (name: string) => () =>
    React.createElement(View, { testID: name });

  return {
    BrainIcon: icon("BrainIcon"),
    ChevronDownIcon: icon("ChevronDownIcon"),
    ChevronRightIcon: icon("ChevronRightIcon"),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("ReasoningGroup", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.state.message.status = { type: "running" };
    h.state.message.parts = [
      { type: "reasoning", status: { type: "complete" } },
      { type: "reasoning", status: { type: "running" } },
    ];
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

  const render = async () => {
    await act(async () => {
      root.render(
        <ReasoningGroup startIndex={0} endIndex={1}>
          <Text>reasoning content</Text>
        </ReasoningGroup>,
      );
    });
  };

  it("streams when a part in the group runs while the message runs", async () => {
    await render();

    expect(container.textContent).toContain("reasoning content");
  });

  it("stays settled when the message is not running", async () => {
    h.state.message.status = { type: "complete" };
    await render();

    expect(container.textContent).not.toContain("reasoning content");
  });
});
