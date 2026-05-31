/**
 * @vitest-environment jsdom
 */
import { act, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { ChainOfThoughtTrace, ChainOfThoughtTraceDisclosure } from "./trace";
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
const FR: Partial<ChainOfThoughtStrings> = {
  reasoning: "Raisonnement",
  traceSummary: ({ searchSteps }) => `Consulté ${searchSteps} sources`,
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

  it("re-localizes the trigger when the provider value changes (the language toggle)", () => {
    const view = renderWithStrings(
      <ChainOfThoughtTraceDisclosure trace={TRACE} />,
      ES,
    );
    expect(triggerText(view.container)).toContain("Razonamiento");

    view.rerender(<ChainOfThoughtTraceDisclosure trace={TRACE} />, FR);
    const text = triggerText(view.container);
    expect(text).toContain("Raisonnement");
    expect(text).toContain("Consulté");
    expect(text).not.toContain("Razonamiento");
    view.unmount();
  });

  it("the bare Trace timeline has no trigger, so swapping strings changes nothing visible", () => {
    // This is exactly why a Trace-based localization demo would appear broken:
    // Trace renders the step data, but none of the trigger's seam strings.
    const view = renderWithStrings(<ChainOfThoughtTrace trace={TRACE} />, ES);
    expect(view.container.textContent).toContain("Tool: search_web");
    expect(view.container.textContent).not.toContain("Razonamiento");
    expect(view.container.textContent).not.toContain("Consultó");
    expect(
      view.container.querySelector("[data-slot=chain-of-thought-trigger]"),
    ).toBeNull();
    view.unmount();
  });

  it("reproduces the demo flicker: an in-place language change crossfades the summary, briefly leaving the previous locale mounted", () => {
    const view = renderWithStrings(
      <ChainOfThoughtTraceDisclosure trace={TRACE} />,
      ES,
    );
    expect(triggerText(view.container)).toContain("Consultó");

    // Switch language in place (what the demo did before the fix). The plain
    // reasoning label swaps instantly, but the crossfaded summary keeps the old
    // locale mounted during the transition — so it reads as "only the reasoning
    // translated" plus a flicker.
    view.rerender(<ChainOfThoughtTraceDisclosure trace={TRACE} />, FR);
    const text = triggerText(view.container);
    expect(text).toContain("Raisonnement"); // reasoning: swapped instantly
    expect(text).toContain("Consulté"); // new summary: entering
    expect(text).toContain("Consultó"); // old summary: still fading out
    view.unmount();
  });

  it("a fresh (remounted) render shows only the selected locale — the fix the demo applies with key={lang}", () => {
    const a = renderWithStrings(
      <ChainOfThoughtTraceDisclosure trace={TRACE} />,
      ES,
    );
    a.unmount();

    const b = renderWithStrings(
      <ChainOfThoughtTraceDisclosure trace={TRACE} />,
      FR,
    );
    const text = triggerText(b.container);
    expect(text).toContain("Raisonnement");
    expect(text).toContain("Consulté");
    expect(text).not.toContain("Consultó");
    expect(text).not.toContain("Razonamiento");
    b.unmount();
  });
});
