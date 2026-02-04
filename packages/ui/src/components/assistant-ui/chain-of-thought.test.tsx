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
import { ChainOfThought } from "./chain-of-thought";

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

const buildWindowedMessage = (): ThreadAssistantMessage => ({
  id: "message-2",
  role: "assistant",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  content: [
    {
      type: "text",
      text: "Step 1",
    },
    {
      type: "text",
      text: "Step 2",
    },
    {
      type: "text",
      text: "Step 3",
    },
    {
      type: "text",
      text: "Step 4",
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

  it("windows grouped message parts via CSS-only windowing", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider message={buildWindowedMessage()} index={0}>
          <ChainOfThought.Trace windowSize={2} />
        </MessageProvider>,
      );
    });

    const windowContainer = container.querySelector(
      ".aui-chain-of-thought-timeline-window",
    ) as HTMLElement | null;

    expect(windowContainer).not.toBeNull();
    expect(windowContainer?.dataset.windowed).toBe("true");
    expect(windowContainer?.style.getPropertyValue("--aui-window-shift")).toBe(
      "2",
    );

    act(() => {
      root.unmount();
    });
  });

  it("renders trace groups with tool summaries and expands", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const trace = [
      {
        kind: "group",
        id: "agent-1",
        label: "Researcher",
        status: "running",
        variant: "subagent",
        children: [
          {
            kind: "step",
            id: "step-1",
            label: "Searching docs",
            type: "search",
            toolName: "search",
            status: "running",
          },
          {
            kind: "group",
            id: "agent-2",
            label: "Subagent",
            children: [
              {
                kind: "step",
                id: "step-2",
                label: "Summarizing",
                type: "text",
                status: "complete",
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

  it("expands groups with windowed timelines without update loops", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const trace = [
      {
        kind: "step",
        id: "root-1",
        label: "Root step",
        type: "text",
        status: "complete",
      },
      {
        kind: "group",
        id: "agent-1",
        label: "Researcher",
        status: "running",
        variant: "subagent",
        children: [
          {
            kind: "step",
            id: "step-1",
            label: "Searching docs",
            type: "search",
            status: "running",
          },
          {
            kind: "group",
            id: "agent-2",
            label: "Subagent",
            children: [
              {
                kind: "step",
                id: "step-2",
                label: "Summarizing",
                type: "text",
                status: "complete",
              },
            ],
          },
        ],
      },
      {
        kind: "step",
        id: "root-2",
        label: "Root step 2",
        type: "text",
        status: "complete",
      },
    ];

    expect(() => {
      act(() => {
        root.render(
          <ChainOfThought.Trace
            trace={trace}
            windowSize={2}
            windowTransition
          />,
        );
      });

      const summary = container.querySelector(
        "[data-slot=chain-of-thought-trace-group-summary]",
      );

      act(() => {
        summary?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      });
    }).not.toThrow();

    act(() => {
      root.unmount();
    });
  });

  it("does not render See all controls for windowed timelines", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const trace = [
      { kind: "step", id: "step-1", label: "Step 1", status: "complete" },
      { kind: "step", id: "step-2", label: "Step 2", status: "complete" },
      { kind: "step", id: "step-3", label: "Step 3", status: "complete" },
      { kind: "step", id: "step-4", label: "Step 4", status: "complete" },
    ];

    act(() => {
      root.render(<ChainOfThought.Trace trace={trace} windowSize={3} />);
    });

    const steps = Array.from(
      container.querySelectorAll(
        '[data-slot=chain-of-thought-timeline]:not([aria-hidden="true"]) [data-slot=chain-of-thought-step]',
      ),
    ) as HTMLElement[];

    expect(steps).toHaveLength(4);
    expect(container.textContent).not.toContain("See all");
    expect(container.textContent).not.toContain("Collapse");

    act(() => {
      root.unmount();
    });
  });

  it("clamps step rows whenever windowing is enabled", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const trace = [
      { kind: "step", id: "step-1", label: "Step 1", status: "complete" },
      { kind: "step", id: "step-2", label: "Step 2", status: "complete" },
      { kind: "step", id: "step-3", label: "Step 3", status: "complete" },
      { kind: "step", id: "step-4", label: "Step 4", status: "complete" },
    ];

    act(() => {
      root.render(<ChainOfThought.Trace trace={trace} windowSize={3} />);
    });

    const styleEl = document.querySelector("#aui-chain-of-thought-keyframes");
    const cssText = styleEl?.textContent ?? "";

    expect(cssText).toContain(
      'data-windowed="true"] [data-slot="chain-of-thought-step"]',
    );
    expect(cssText).toContain(
      'data-windowed="true"] [data-slot="chain-of-thought-step-content"]',
    );
    expect(cssText).toContain('data-expand-animating="false"]');
    expect(cssText).toContain("max-height: none");
    expect(cssText).toContain(
      ':has([data-slot="chain-of-thought-trace-group-summary"][aria-expanded="true"])',
    );

    act(() => {
      root.unmount();
    });
  });

  it("does not throw when windowTransition is disabled", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const trace = [
      { kind: "step", id: "step-1", label: "Step 1", status: "complete" },
      { kind: "step", id: "step-2", label: "Step 2", status: "complete" },
    ];

    expect(() => {
      act(() => {
        root.render(
          <ChainOfThought.Trace
            trace={trace}
            windowSize={2}
            windowTransition={false}
          />,
        );
      });

      act(() => {
        root.render(
          <ChainOfThought.Trace
            trace={[
              ...trace,
              {
                kind: "step",
                id: "step-3",
                label: "Step 3",
                status: "complete",
              },
            ]}
            windowSize={2}
            windowTransition={false}
          />,
        );
      });
    }).not.toThrow();

    act(() => {
      root.unmount();
    });
  });

  it("animates window shift when a new step pushes the window", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const trace = [
      { kind: "step", id: "step-1", label: "Step 1", status: "complete" },
      { kind: "step", id: "step-2", label: "Step 2", status: "complete" },
      { kind: "step", id: "step-3", label: "Step 3", status: "complete" },
    ];

    act(() => {
      root.render(<ChainOfThought.Trace trace={trace} windowSize={3} />);
    });

    const nextTrace = [
      ...trace,
      { kind: "step", id: "step-4", label: "Step 4", status: "complete" },
    ];

    act(() => {
      root.render(<ChainOfThought.Trace trace={nextTrace} windowSize={3} />);
    });

    const shiftWrapper = container.querySelector('[data-window-shift="true"]');

    expect(shiftWrapper).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("keeps the window transition enabled when windowing activates", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const trace = [
      { kind: "step", id: "step-1", label: "Step 1", status: "complete" },
      { kind: "step", id: "step-2", label: "Step 2", status: "complete" },
      { kind: "step", id: "step-3", label: "Step 3", status: "complete" },
    ];

    act(() => {
      root.render(
        <ChainOfThought.Trace trace={trace} windowSize={3} windowTransition />,
      );
    });

    const windowBefore = container.querySelector(
      ".aui-chain-of-thought-timeline-window",
    ) as HTMLElement | null;
    expect(windowBefore?.dataset.windowActive).toBe("false");

    const traceWithFourth = [
      ...trace,
      { kind: "step", id: "step-4", label: "Step 4", status: "complete" },
    ];

    act(() => {
      root.render(
        <ChainOfThought.Trace
          trace={traceWithFourth}
          windowSize={3}
          windowTransition
        />,
      );
    });

    const windowActivated = container.querySelector(
      ".aui-chain-of-thought-timeline-window",
    ) as HTMLElement | null;
    expect(windowActivated?.dataset.windowActive).toBe("true");
    expect(windowActivated?.dataset.windowTransition).toBe("true");

    const traceWithFifth = [
      ...traceWithFourth,
      { kind: "step", id: "step-5", label: "Step 5", status: "complete" },
    ];

    act(() => {
      root.render(
        <ChainOfThought.Trace
          trace={traceWithFifth}
          windowSize={3}
          windowTransition
        />,
      );
    });

    const windowShifted = container.querySelector(
      ".aui-chain-of-thought-timeline-window",
    ) as HTMLElement | null;
    expect(windowShifted?.dataset.windowTransition).toBe("true");

    act(() => {
      root.unmount();
    });
  });

  it("keeps step rows aligned to the top when windowing is active", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const trace = [
      { kind: "step", id: "step-1", label: "Step 1", status: "complete" },
      { kind: "step", id: "step-2", label: "Step 2", status: "complete" },
      { kind: "step", id: "step-3", label: "Step 3", status: "complete" },
      { kind: "step", id: "step-4", label: "Step 4", status: "complete" },
    ];

    act(() => {
      root.render(<ChainOfThought.Trace trace={trace} windowSize={3} />);
    });

    const styleEl = document.querySelector("#aui-chain-of-thought-keyframes");
    const cssText = styleEl?.textContent ?? "";
    const ruleMatch = cssText.match(
      /data-windowed="true"\]\s*\[data-slot="chain-of-thought-step"\]\s*\{[^}]*\}/,
    );

    expect(ruleMatch).not.toBeNull();
    expect(ruleMatch?.[0]).toContain("align-items: flex-start");

    act(() => {
      root.unmount();
    });
  });

  it("targets the newest step for CSS-only window shifts", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    const trace = [
      { kind: "step", id: "step-1", label: "Step 1", status: "complete" },
      { kind: "step", id: "step-2", label: "Step 2", status: "complete" },
      { kind: "step", id: "step-3", label: "Step 3", status: "complete" },
    ];

    act(() => {
      root.render(
        <ChainOfThought.Trace trace={trace} windowSize={3} windowTransition />,
      );
    });

    const nextTrace = [
      ...trace,
      { kind: "step", id: "step-4", label: "Step 4", status: "complete" },
    ];

    act(() => {
      root.render(
        <ChainOfThought.Trace
          trace={nextTrace}
          windowSize={3}
          windowTransition
        />,
      );
    });

    const shiftWrapper = container.querySelector(
      '[data-window-shift="true"]',
    ) as HTMLElement | null;

    expect(shiftWrapper).not.toBeNull();

    const currentList = container.querySelector(
      '[data-slot=chain-of-thought-timeline]:not([aria-hidden="true"])',
    );
    const steps = Array.from(
      currentList?.querySelectorAll("[data-slot=chain-of-thought-step]") ?? [],
    );
    const lastStep = steps.at(-1) as HTMLElement | undefined;
    expect(lastStep?.textContent).toContain("Step 4");

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
      { kind: "step", id: "step-1", label: "Step 1", status: "running" },
    ];

    act(() => {
      root.render(
        <ChainOfThought.TraceDisclosure
          trace={runningTrace}
          windowSize={2}
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
      { kind: "step", id: "step-1", label: "Step 1", status: "complete" },
    ];

    act(() => {
      root.render(
        <ChainOfThought.TraceDisclosure trace={completeTrace} windowSize={2} />,
      );
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
        kind: "group",
        id: "agent-1",
        label: "Researcher",
        status: "running",
        children: [
          {
            kind: "step",
            id: "step-1",
            label: "Searching",
            status: "running",
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
        kind: "group",
        id: "agent-1",
        label: "Researcher",
        status: "complete",
        children: [
          {
            kind: "step",
            id: "step-1",
            label: "Searching",
            status: "complete",
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
