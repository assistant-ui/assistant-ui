/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { createRoot } from "react-dom/client";
import { act } from "react";
import {
  MessagePrimitive,
  MessageProvider,
  type ThreadAssistantMessage,
} from "@assistant-ui/react";
import { ChainOfThought, Crossfade } from "./chain-of-thought";

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

const ChainOfThoughtWithSearchWebActivityCallback = () => (
  <ChainOfThought
    toolActivity={{
      search_web: ({ statusType }: { statusType?: string }) =>
        statusType === "running" ? "Searching the web" : "Searched the web",
    }}
  />
);

const ChainOfThoughtWithCustomTriggerContentRenderer = () => (
  <ChainOfThought
    toolActivity={{
      search_web: ({
        fallbackLabel,
        messageStatusType,
      }: {
        fallbackLabel: string;
        messageStatusType?: string;
      }) =>
        messageStatusType === "running"
          ? `Running ${fallbackLabel}`
          : `Used ${fallbackLabel}`,
    }}
    renderTriggerContent={({ displayLabel, activity, active, open }) => (
      <span data-slot="custom-trigger-content">
        {active ? "Live" : "Done"} {open ? "Open" : "Closed"} :: {displayLabel}
        {activity ? ` :: ${activity}` : ""}
      </span>
    )}
  />
);

const ChainOfThoughtWithFalsyTriggerContentRenderer = () => (
  <ChainOfThought renderTriggerContent={() => 0} />
);

const ChainOfThoughtWithStatusEchoActivity = () => (
  <ChainOfThought
    toolActivity={{
      search_web: ({ statusType }: { statusType?: string }) =>
        `status:${statusType ?? "undefined"}`,
    }}
    renderTriggerContent={({ activity }) => (
      <span data-slot="status-echo-trigger-content">{activity}</span>
    )}
  />
);

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
  ] as any,
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const buildPrimitiveCoTMessage = (): ThreadAssistantMessage => ({
  id: "message-cot-1",
  role: "assistant",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  content: [
    {
      type: "reasoning",
      text: "Looking through the request and planning the response.",
    },
    {
      type: "text",
      text: "Here is the final answer.",
    },
  ] as any,
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const buildPrimitiveCoTToolMessage = (): ThreadAssistantMessage => ({
  id: "message-cot-tool-1",
  role: "assistant",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  content: [
    {
      type: "reasoning",
      text: "Checking sources before answering.",
    },
    {
      type: "tool-call",
      toolCallId: "tool-1",
      toolName: "search_web",
      args: { query: "assistant-ui chain of thought primitive" },
      argsText: '{"query":"assistant-ui chain of thought primitive"}',
      parentId: "step-1",
    },
    {
      type: "text",
      text: "I found relevant docs and examples.",
    },
  ] as any,
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const buildPrimitiveCoTRunningToolMessage = (): ThreadAssistantMessage => ({
  id: "message-cot-tool-running-1",
  role: "assistant",
  createdAt: new Date("2024-01-01T00:00:00Z"),
  content: [
    {
      type: "reasoning",
      text: "Gathering external context.",
    },
    {
      type: "tool-call",
      toolCallId: "tool-running-1",
      toolName: "search_web",
      args: { query: "assistant-ui chain of thought ui" },
      argsText: '{"query":"assistant-ui chain of thought ui"}',
      status: { type: "running" },
      parentId: "step-1",
    },
    {
      type: "text",
      text: "I will summarize the findings next.",
    },
  ] as any,
  status: { type: "running" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const buildPrimitiveCoTCompletedToolMessage = (): ThreadAssistantMessage => ({
  id: "message-cot-tool-complete-1",
  role: "assistant",
  createdAt: new Date("2024-01-01T00:00:02Z"),
  content: [
    {
      type: "reasoning",
      text: "Gathering external context.",
    },
    {
      type: "tool-call",
      toolCallId: "tool-running-1",
      toolName: "search_web",
      args: { query: "assistant-ui chain of thought ui" },
      argsText: '{"query":"assistant-ui chain of thought ui"}',
      result: { hits: 4 },
      parentId: "step-1",
    },
    {
      type: "text",
      text: "I will summarize the findings next.",
    },
  ] as any,
  status: { type: "complete", reason: "stop" },
  metadata: {
    unstable_state: null,
    unstable_annotations: [],
    unstable_data: [],
    steps: [],
    custom: {},
  },
});

const buildPrimitiveCoTToolMessageFetchDocs = (): ThreadAssistantMessage => ({
  id: "message-cot-tool-2",
  role: "assistant",
  createdAt: new Date("2024-01-01T00:00:01Z"),
  content: [
    {
      type: "reasoning",
      text: "Pulling docs for verification.",
    },
    {
      type: "tool-call",
      toolCallId: "tool-2",
      toolName: "fetch_docs",
      args: { ids: ["doc-1"] },
      argsText: '{"ids":["doc-1"]}',
      parentId: "step-2",
    },
    {
      type: "text",
      text: "I found the supporting documentation.",
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

const buildPrimitiveCoTCompleteToolWhileMessageStreaming =
  (): ThreadAssistantMessage => ({
    id: "message-cot-tool-complete-message-running-1",
    role: "assistant",
    createdAt: new Date("2024-01-01T00:00:02Z"),
    content: [
      {
        type: "reasoning",
        text: "Gathering external context.",
      },
      {
        type: "tool-call",
        toolCallId: "tool-running-1",
        toolName: "search_web",
        args: { query: "assistant-ui chain of thought ui" },
        argsText: '{"query":"assistant-ui chain of thought ui"}',
        status: { type: "complete", reason: "stop" },
        result: { hits: 4 },
        parentId: "step-1",
      },
      {
        type: "text",
        text: "Streaming final answer...",
      },
    ] as any,
    status: { type: "running" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  });

const buildPrimitiveCoTDuplicateReasoningWhileStreaming =
  (): ThreadAssistantMessage => ({
    id: "message-cot-duplicate-reasoning-1",
    role: "assistant",
    createdAt: new Date("2024-01-01T00:00:03Z"),
    content: [
      {
        type: "reasoning",
        text: "Analyzing constraints.",
      },
      {
        type: "reasoning",
        text: "Analyzing constraints.",
      },
      {
        type: "text",
        text: "Final answer is still streaming.",
      },
    ] as any,
    status: { type: "running" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  });

describe("ChainOfThought primitive integration", () => {
  it("renders as a MessagePrimitive.Parts ChainOfThought component with collapsed-by-default behavior", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider message={buildPrimitiveCoTMessage()} index={0}>
          <MessagePrimitive.Parts
            components={{
              ChainOfThought,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;

    expect(trigger).not.toBeNull();
    expect(trigger?.textContent).toContain("Reasoning");
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(container.textContent).toContain("Here is the final answer.");
    const content = container.querySelector(
      "[data-slot=chain-of-thought-content]",
    );
    expect(content?.textContent ?? "").not.toContain(
      "Looking through the request and planning the response.",
    );

    act(() => {
      root.unmount();
    });
  });

  it("renders a collapsed tool-call activity without tools scope", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider message={buildPrimitiveCoTToolMessage()} index={0}>
          <MessagePrimitive.Parts
            components={{
              ChainOfThought,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;
    const activity = container.querySelector(
      "[data-slot=chain-of-thought-trigger-activity]",
    );

    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(activity?.textContent).toContain("search web");

    act(() => {
      root.unmount();
    });
  });

  it("auto-expands while running and keeps timeline unbounded by default", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTRunningToolMessage()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;

    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(trigger?.textContent).toContain("Reasoning");
    const activity = container.querySelector(
      "[data-slot=chain-of-thought-trigger-activity]",
    );
    expect(activity?.textContent).toContain("search web");
    const timeline = container.querySelector(
      '[data-slot=chain-of-thought-timeline]:not([aria-hidden="true"])',
    ) as HTMLElement | null;
    expect(timeline?.className).not.toContain("max-h-64");
    expect(timeline?.className).not.toContain("overflow-y-auto");

    act(() => {
      root.unmount();
    });
  });

  it("auto-collapses after streaming completes", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTRunningToolMessage()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTCompletedToolMessage()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const triggerAfterComplete = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;
    expect(triggerAfterComplete?.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      root.unmount();
    });
  });

  it("supports callback-based tool activity copy", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTRunningToolMessage()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought: ChainOfThoughtWithSearchWebActivityCallback,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const runningActivity = container.querySelector(
      "[data-slot=chain-of-thought-trigger-activity]",
    );
    expect(runningActivity?.textContent).toContain("Searching the web");

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTCompletedToolMessage()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought: ChainOfThoughtWithSearchWebActivityCallback,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const completeActivity = container.querySelector(
      "[data-slot=chain-of-thought-trigger-activity]",
    );
    expect(completeActivity?.textContent).toContain("Searched the web");

    act(() => {
      root.unmount();
    });
  });

  it("supports custom trigger content rendering at the UI layer", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTRunningToolMessage()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought: ChainOfThoughtWithCustomTriggerContentRenderer,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const runningLabel = container.querySelector(
      "[data-slot=custom-trigger-content]",
    );
    expect(runningLabel?.textContent).toContain("Live Open :: Reasoning");
    expect(runningLabel?.textContent).toContain("Running search web");

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTCompletedToolMessage()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought: ChainOfThoughtWithCustomTriggerContentRenderer,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const completeLabel = container.querySelector(
      "[data-slot=custom-trigger-content]",
    );
    expect(completeLabel?.textContent).toContain("Done Closed :: Reasoning");
    expect(completeLabel?.textContent).toContain("search web");

    act(() => {
      root.unmount();
    });
  });

  it("does not relabel completed tool activity as running while final text streams", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTCompleteToolWhileMessageStreaming()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought: ChainOfThoughtWithStatusEchoActivity,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=status-echo-trigger-content]",
    ) as HTMLElement | null;
    expect(trigger?.textContent).toContain("status:complete");

    act(() => {
      root.unmount();
    });
  });

  it("does not auto-open when only the message is streaming", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTCompleteToolWhileMessageStreaming()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");

    act(() => {
      root.unmount();
    });
  });

  it("crossfades the collapsed activity when the latest step changes", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider message={buildPrimitiveCoTToolMessage()} index={0}>
          <MessagePrimitive.Parts
            components={{
              ChainOfThought,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const initialActivity = container.querySelector(
      "[data-slot=chain-of-thought-trigger-activity]",
    );
    expect(initialActivity?.textContent).toContain("search web");

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTToolMessageFetchDocs()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const updatedActivity = container.querySelector(
      "[data-slot=chain-of-thought-trigger-activity]",
    );
    expect(updatedActivity?.textContent).toContain("search web");
    expect(updatedActivity?.textContent).toContain("fetch docs");
    expect(updatedActivity?.querySelector("[aria-hidden]")).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("marks only one duplicate reasoning step as active while streaming", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTDuplicateReasoningWhileStreaming()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const activeSteps = container.querySelectorAll(
      '[data-slot="chain-of-thought-step"][data-status="active"]',
    );
    expect(activeSteps).toHaveLength(1);

    act(() => {
      root.unmount();
    });
  });

  it("renders falsy custom trigger content instead of falling back to defaults", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <MessageProvider message={buildPrimitiveCoTMessage()} index={0}>
          <MessagePrimitive.Parts
            components={{
              ChainOfThought: ChainOfThoughtWithFalsyTriggerContentRenderer,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;

    expect(trigger?.textContent?.trim()).toBe("0");

    act(() => {
      root.unmount();
    });
  });
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

  it("respects constrainHeight={false} for trace nodes", () => {
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
      root.render(
        <ChainOfThought.Trace trace={trace} constrainHeight={false} />,
      );
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

describe("Crossfade", () => {
  it("renders the current value on mount without transition", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <Crossfade value="hello">{(v) => <span>{v}</span>}</Crossfade>,
      );
    });

    expect(container.textContent).toBe("hello");
    // No exit span (no transition)
    const exitSpan = container.querySelector("[aria-hidden]");
    expect(exitSpan).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("shows both old and new values during transition", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <Crossfade value="alpha">{(v) => <span>{v}</span>}</Crossfade>,
      );
    });

    expect(container.textContent).toBe("alpha");

    // Change value
    act(() => {
      root.render(
        <Crossfade value="beta">{(v) => <span>{v}</span>}</Crossfade>,
      );
    });

    // During transition, both values should be in the DOM
    expect(container.textContent).toContain("alpha");
    expect(container.textContent).toContain("beta");

    // The exit span should exist (aria-hidden, absolute)
    const exitSpan = container.querySelector("[aria-hidden]");
    expect(exitSpan).not.toBeNull();
    expect(exitSpan?.textContent).toBe("alpha");

    act(() => {
      root.unmount();
    });
  });

  it("cleans up previous value after transition completes", async () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <Crossfade value="first" exitDuration={50} enterDuration={50}>
          {(v) => <span>{v}</span>}
        </Crossfade>,
      );
    });

    act(() => {
      root.render(
        <Crossfade value="second" exitDuration={50} enterDuration={50}>
          {(v) => <span>{v}</span>}
        </Crossfade>,
      );
    });

    // Both values present during transition
    expect(container.textContent).toContain("first");
    expect(container.textContent).toContain("second");

    // Wait for cleanup timeout (50ms total)
    await act(async () => {
      await new Promise((r) => setTimeout(r, 100));
    });

    // After cleanup, only the new value should remain
    expect(container.textContent).toBe("second");
    expect(container.querySelector("[aria-hidden]")).toBeNull();

    act(() => {
      root.unmount();
    });
  });
});
