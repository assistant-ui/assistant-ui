/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import {
  MessageProvider,
  type ThreadAssistantMessage,
} from "@assistant-ui/react";
import { ChainOfThought, type TraceNode } from "./chain-of-thought-v2";

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

const buildMessage = (): ThreadAssistantMessage => ({
  id: "message-1",
  role: "assistant",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  content: [
    {
      type: "text",
      text: "Grouped step",
      parentId: "group-1",
    },
    {
      type: "text",
      text: "Grouped step continued",
      parentId: "group-1",
    },
    {
      type: "text",
      text: "Standalone step",
    },
  ],
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

describe("ChainOfThought.Trace", () => {
  it("applies stagger indices to trace steps", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider message={buildMessage()} index={0}>
          <ChainOfThought.Trace />
        </MessageProvider>,
      );
    });

    const steps = Array.from(
      container.querySelectorAll(
        '[data-slot=chain-of-thought-timeline]:not([aria-hidden="true"]) [data-slot=chain-of-thought-step]',
      ),
    ) as HTMLElement[];

    expect(steps).toHaveLength(2);
    expect(
      steps.map((step) => step.style.getPropertyValue("--step-index")),
    ).toEqual(["0", "1"]);

    act(() => {
      root.unmount();
    });
  });

  it("renders trace groups with tool summaries and expands", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const trace = [
      {
        kind: "group" as const,
        id: "agent-1",
        label: "Researcher",
        status: "running" as const,
        variant: "subagent" as const,
        children: [
          {
            kind: "step" as const,
            id: "step-1",
            label: "Searching docs",
            type: "search" as const,
            toolName: "search",
            status: "running" as const,
          },
          {
            kind: "group" as const,
            id: "agent-2",
            label: "Subagent",
            children: [
              {
                kind: "step" as const,
                id: "step-2",
                label: "Summarizing",
                type: "text" as const,
                status: "complete" as const,
              },
            ],
          },
        ],
      },
    ];

    act(() => {
      root.render(<ChainOfThought.Trace trace={trace} />);
    });

    expect(container.textContent).toContain("Researcher");
    expect(container.textContent).toContain("search");

    const summary = container.querySelector(
      "[data-slot=chain-of-thought-trace-group-summary]",
    );

    act(() => {
      summary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(container.textContent).toContain("Subagent");

    act(() => {
      root.unmount();
    });
  });

  it("respects scrollable={false} for trace nodes", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const trace = [
      {
        kind: "step" as const,
        id: "step-1",
        label: "Step 1",
        status: "complete" as const,
      },
      {
        kind: "step" as const,
        id: "step-2",
        label: "Step 2",
        status: "complete" as const,
      },
    ];

    act(() => {
      root.render(<ChainOfThought.Trace trace={trace} scrollable={false} />);
    });

    const timeline = container.querySelector(
      '[data-slot=chain-of-thought-timeline]:not([aria-hidden="true"])',
    ) as HTMLElement | null;

    expect(timeline?.className).not.toContain("max-h-64");
    expect(timeline?.className).not.toContain("overflow-y-auto");

    act(() => {
      root.unmount();
    });
  });
});

describe("ChainOfThought.TraceDisclosure", () => {
  it("auto-collapses after streaming completes and swaps the summary label", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const runningTrace = [
      {
        kind: "step" as const,
        id: "step-1",
        label: "Step 1",
        status: "running" as const,
      },
    ];

    act(() => {
      root.render(
        <ChainOfThought.TraceDisclosure
          trace={runningTrace}
          label="Researching..."
        />,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLElement | null;
    expect(trigger?.textContent).toContain("Researching");
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    const completeTrace = [
      {
        kind: "step" as const,
        id: "step-1",
        label: "Step 1",
        status: "complete" as const,
      },
    ];

    act(() => {
      root.render(<ChainOfThought.TraceDisclosure trace={completeTrace} />);
    });

    const completedTrigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLElement | null;
    expect(completedTrigger?.textContent).toContain("Completed 1 step");
    expect(completedTrigger?.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      root.unmount();
    });
  });

  it("locks group expansion while streaming", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const runningTrace = [
      {
        kind: "group" as const,
        id: "agent-1",
        label: "Researcher",
        status: "running" as const,
        children: [
          {
            kind: "step" as const,
            id: "step-1",
            label: "Searching",
            status: "running" as const,
          },
        ],
      },
    ];

    act(() => {
      root.render(<ChainOfThought.TraceDisclosure trace={runningTrace} />);
    });

    const summary = container.querySelector(
      "[data-slot=chain-of-thought-trace-group-summary]",
    ) as HTMLButtonElement | null;
    expect(summary?.hasAttribute("disabled")).toBe(true);

    const completedTrace = [
      {
        kind: "group" as const,
        id: "agent-1",
        label: "Researcher",
        status: "complete" as const,
        children: [
          {
            kind: "step" as const,
            id: "step-1",
            label: "Searching",
            status: "complete" as const,
          },
        ],
      },
    ];

    act(() => {
      root.render(<ChainOfThought.TraceDisclosure trace={completedTrace} />);
    });

    const trigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLElement | null;
    act(() => {
      trigger?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    const summaryAfter = container.querySelector(
      "[data-slot=chain-of-thought-trace-group-summary]",
    ) as HTMLButtonElement | null;
    expect(summaryAfter?.hasAttribute("disabled")).toBe(false);

    act(() => {
      root.unmount();
    });
  });
});
