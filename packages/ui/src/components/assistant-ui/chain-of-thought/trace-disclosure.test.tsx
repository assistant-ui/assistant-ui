/**
 * @vitest-environment jsdom
 */
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { ChainOfThoughtTraceDisclosure } from "./trace";
import {
  ChainOfThoughtStringsContext,
  mergeChainOfThoughtStrings,
  type ChainOfThoughtStrings,
} from "./strings";
import type { TraceNode } from "./model";

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

const TRACE: TraceNode[] = [
  {
    kind: "step",
    id: "s1",
    label: "Tool: search_web",
    type: "search",
    toolName: "search_web",
    status: "complete",
  },
  {
    kind: "step",
    id: "s2",
    label: "Reviewing sources",
    type: "tool",
    toolName: "read_source",
    status: "complete",
  },
];

const ES: Partial<ChainOfThoughtStrings> = {
  reasoning: "Razonamiento",
  traceSummary: ({ searchSteps }) => `Consultó ${searchSteps} fuentes`,
};

const renderWithStrings = (
  node: ReactNode,
  strings: Partial<ChainOfThoughtStrings>,
) => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const render = (
    nextNode: ReactNode,
    nextStrings: Partial<ChainOfThoughtStrings>,
  ) => {
    act(() => {
      root.render(
        <ChainOfThoughtStringsContext.Provider
          value={mergeChainOfThoughtStrings(nextStrings)}
        >
          {nextNode}
        </ChainOfThoughtStringsContext.Provider>,
      );
    });
  };
  render(node, strings);
  return {
    container,
    rerender: render,
    unmount: () => act(() => root.unmount()),
  };
};

const triggerText = (container: HTMLElement) =>
  container.querySelector("[data-slot=chain-of-thought-trigger]")
    ?.textContent ?? "";

describe("ChainOfThought localization via ChainOfThoughtStringsContext", () => {
  it("localizes the TraceDisclosure trigger label and collapsed summary", () => {
    const view = renderWithStrings(
      <ChainOfThoughtTraceDisclosure trace={TRACE} />,
      ES,
    );
    const text = triggerText(view.container);
    expect(text).toContain("Razonamiento");
    expect(text).toContain("Consultó");
    expect(text).not.toContain("Reasoning");
    expect(text).not.toContain("Researched");
    view.unmount();
  });
});
