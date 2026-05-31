/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import { AgentTraceDisclosure } from "./disclosure";
import type { AgentTraceNode } from "./model";

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

const TRACE: AgentTraceNode[] = [
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

const triggerText = (container: HTMLElement) =>
  container.querySelector("[data-slot=chain-of-thought-trigger]")
    ?.textContent ?? "";

describe("AgentTraceDisclosure", () => {
  it("renders a custom label and summary for a pre-shaped trace", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <AgentTraceDisclosure
          trace={TRACE}
          label="Trace"
          summary={({ searchSteps }) => `Consulted ${searchSteps} sources`}
        />,
      );
    });

    const text = triggerText(container);
    expect(text).toContain("Trace");
    expect(text).toContain("Consulted 1 sources");

    act(() => root.unmount());
  });
});
