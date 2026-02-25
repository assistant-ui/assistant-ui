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
    toolActivityLabels={{
      search_web: ({ statusType }: { statusType?: string }) =>
        statusType === "running" ? "Searching the web" : "Searched the web",
    }}
  />
);

const ChainOfThoughtWithCustomTriggerContentRenderer = () => (
  <ChainOfThought
    toolActivityLabels={{
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
    renderTriggerContent={({
      displayLabel,
      activityLabel,
      phase,
      isOpen,
      elapsedSeconds,
    }) => (
      <span data-slot="custom-trigger-content">
        {phase === "running" ? "Live" : "Done"} {isOpen ? "Open" : "Closed"} ::{" "}
        {displayLabel}
        {activityLabel ? ` :: ${activityLabel}` : ""}
        {elapsedSeconds !== undefined ? ` :: t=${elapsedSeconds}` : ""}
      </span>
    )}
  />
);

const ChainOfThoughtWithFalsyTriggerContentRenderer = () => (
  <ChainOfThought renderTriggerContent={() => 0} />
);

const ChainOfThoughtWithStatusEchoActivity = () => (
  <ChainOfThought
    toolActivityLabels={{
      search_web: ({ statusType }: { statusType?: string }) =>
        `status:${statusType ?? "undefined"}`,
    }}
    renderTriggerContent={({ activityLabel }) => (
      <span data-slot="status-echo-trigger-content">{activityLabel}</span>
    )}
  />
);

const ChainOfThoughtWithNoAutoCollapse = () => (
  <ChainOfThought autoCollapseOnComplete={false} />
);

const ChainOfThoughtWithTriggerArgEcho = () => (
  <ChainOfThought
    renderTriggerContent={({
      reasoningLabel,
      displayLabel,
      activityLabel,
      phase,
      isOpen,
      elapsedSeconds,
    }) => (
      <span data-slot="trigger-arg-echo">
        reasoning:{reasoningLabel} :: display:{displayLabel} :: activity:
        {activityLabel ?? "none"} :: phase:{phase} :: open:{String(isOpen)} ::
        elapsed:{elapsedSeconds ?? "none"}
      </span>
    )}
  />
);

const ChainOfThoughtWithLegacyTriggerFieldNames = () => (
  <ChainOfThought
    toolActivityLabels={{
      search_web: ({ statusType }: { statusType?: string }) =>
        statusType === "running" ? "Searching the web" : "Searched the web",
    }}
    renderTriggerContent={(
      args: {
        label?: string;
        activity?: string;
      } & Record<string, unknown>,
    ) => (
      <span data-slot="legacy-trigger-content">
        <span data-slot="legacy-trigger-title">{args.label}</span>
        <span data-slot="legacy-trigger-activity">{args.activity}</span>
      </span>
    )}
  />
);

const ChainOfThoughtWithToolSummaryAndOutlineVariant = () => (
  <ChainOfThought
    variant="outline"
    toolActivityLabels={{
      search_web: ({ statusType }) =>
        statusType === "running"
          ? "Searching with search web"
          : "Searched with search web",
    }}
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
    expect(trigger?.textContent).toContain(
      "Looking through the request and planning the response.",
    );
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    const rootEl = container.querySelector(
      "[data-slot=chain-of-thought-root]",
    ) as HTMLElement | null;
    expect(rootEl?.getAttribute("data-variant")).toBe("ghost");
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

  it("renders collapsed trigger content with reasoning title and activity by default", () => {
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
    expect(activity?.textContent).toContain("Searched the web");
    expect(
      container.querySelector(
        "[data-slot=chain-of-thought-trigger-reasoning-label]",
      )?.textContent,
    ).toContain("Reasoning");

    act(() => {
      root.unmount();
    });
  });

  it("renders a non-collapsing reasoning title alongside activity in the collapsed trigger", () => {
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

    const title = container.querySelector(
      "[data-slot=chain-of-thought-trigger-reasoning-label]",
    ) as HTMLElement | null;
    const activity = container.querySelector(
      "[data-slot=chain-of-thought-trigger-activity]",
    ) as HTMLElement | null;

    expect(title).not.toBeNull();
    expect(title?.textContent).toContain("Reasoning");
    expect(title?.className).toContain("shrink-0");
    expect(activity?.textContent).toContain("Searched the web");
    expect(activity?.className).toContain("min-w-[12ch]");

    act(() => {
      root.unmount();
    });
  });

  it("uses block wrappers for trigger label layout to avoid inline width collapse", () => {
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

    const labelWrapper = container.querySelector(
      "[data-slot=chain-of-thought-trigger-label]",
    ) as HTMLElement | null;
    const activityWrapper = container.querySelector(
      "[data-slot=chain-of-thought-trigger-activity]",
    ) as HTMLElement | null;
    const crossfadeWrapper = container.querySelector(
      "[data-slot=chain-of-thought-crossfade]",
    ) as HTMLElement | null;

    expect(labelWrapper?.tagName).toBe("DIV");
    expect(activityWrapper?.tagName).toBe("DIV");
    expect(crossfadeWrapper?.tagName).toBe("DIV");

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
    expect(trigger?.textContent).toContain("Searching the web");
    const activity = container.querySelector(
      "[data-slot=chain-of-thought-trigger-activity]",
    );
    expect(activity?.textContent).toContain("Searching the web");
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

  it("keeps the accordion open after streaming completes when autoCollapseOnComplete is false", () => {
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
              ChainOfThought: ChainOfThoughtWithNoAutoCollapse,
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
              ChainOfThought: ChainOfThoughtWithNoAutoCollapse,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const triggerAfterComplete = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;
    expect(triggerAfterComplete?.getAttribute("aria-expanded")).toBe("true");

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

  it("uses natural default tool activity phrasing", () => {
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
              ChainOfThought,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const completedActivity = container.querySelector(
      "[data-slot=chain-of-thought-trigger-activity]",
    );
    expect(completedActivity?.textContent).toContain("Searched the web");

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

  it("passes activityLabel, phase, isOpen, and elapsedSeconds to renderTriggerContent", () => {
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
              ChainOfThought: ChainOfThoughtWithTriggerArgEcho,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const runningEcho = container.querySelector("[data-slot=trigger-arg-echo]");
    expect(runningEcho?.textContent).toContain("reasoning:Reasoning");
    expect(runningEcho?.textContent).toContain("activity:Searching the web");
    expect(runningEcho?.textContent).toContain("phase:running");
    expect(runningEcho?.textContent).toContain("open:true");
    expect(runningEcho?.textContent).toContain("elapsed:");

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTCompletedToolMessage()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought: ChainOfThoughtWithTriggerArgEcho,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const completeEcho = container.querySelector(
      "[data-slot=trigger-arg-echo]",
    );
    expect(completeEcho?.textContent).toContain("phase:complete");
    expect(completeEcho?.textContent).toContain("open:false");

    act(() => {
      root.unmount();
    });
  });

  it("supports legacy trigger renderer field names for title and step labels", () => {
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
              ChainOfThought: ChainOfThoughtWithLegacyTriggerFieldNames,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const legacyTitle = container.querySelector(
      "[data-slot=legacy-trigger-title]",
    ) as HTMLElement | null;
    const legacyActivity = container.querySelector(
      "[data-slot=legacy-trigger-activity]",
    ) as HTMLElement | null;

    expect(legacyTitle?.textContent).toContain("Reasoning");
    expect(legacyActivity?.textContent).toContain("Searching the web");

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
    expect(initialActivity?.textContent).toContain("Searched the web");

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
    expect(updatedActivity?.textContent).toContain("Searched the web");
    expect(updatedActivity?.textContent).toContain("Fetched docs");
    expect(updatedActivity?.querySelector("[aria-hidden]")).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("applies trigger shimmer only during active phases", () => {
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

    expect(
      container.querySelector(
        "[data-slot=chain-of-thought-trigger-activity-shimmer]",
      ),
    ).not.toBeNull();
    expect(
      container.querySelector(
        "[data-slot=chain-of-thought-trigger-activity-shimmer]",
      )?.className,
    ).toContain("text-foreground/40");

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

    expect(
      container.querySelector(
        "[data-slot=chain-of-thought-trigger-activity-shimmer]",
      ),
    ).toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("applies shimmer to the running expanded tool activity label", () => {
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

    const runningActivityLabel = container.querySelector(
      "[data-slot=chain-of-thought-tool-activity-label]",
    ) as HTMLElement | null;
    const runningActivityRow = runningActivityLabel?.parentElement;
    expect(runningActivityLabel?.tagName).toBe("DIV");
    expect(runningActivityRow?.className).toContain("-mt-0.5");
    expect(runningActivityLabel?.className).toContain("min-w-0");
    expect(runningActivityLabel?.className).toContain("max-w-[52ch]");
    expect(runningActivityLabel?.className).toContain("leading-5");
    expect(runningActivityLabel?.className).not.toContain("flex-1");
    expect(runningActivityLabel?.className).not.toContain("w-full");
    expect(runningActivityLabel?.className).not.toContain("shimmer-container");
    const runningShimmer = container.querySelector(
      "[data-slot=chain-of-thought-tool-activity-label-shimmer]",
    );
    expect(runningShimmer).toBeNull();
    expect(runningActivityLabel?.className).toContain("shimmer");
    expect(runningActivityLabel?.className).toContain(
      "motion-reduce:animate-none",
    );

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

    const completeShimmer = container.querySelector(
      "[data-slot=chain-of-thought-tool-activity-label-shimmer]",
    );
    expect(completeShimmer).toBeNull();
    const completeActivityLabel = container.querySelector(
      "[data-slot=chain-of-thought-tool-activity-label]",
    ) as HTMLElement | null;
    if (completeActivityLabel) {
      expect(completeActivityLabel.className).not.toContain("shimmer");
    }

    act(() => {
      root.unmount();
    });
  });

  it("renders expanded tool activity labels together with tool UI", () => {
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

    const trigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    const content = container.querySelector(
      "[data-slot=chain-of-thought-content]",
    );
    expect(content?.textContent).toContain("Searching the web");
    expect(content?.textContent).toContain("assistant-ui chain of thought ui");

    act(() => {
      root.unmount();
    });
  });

  it("renders a terminal done step with elapsed time when processing completes", () => {
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
              ChainOfThought: ChainOfThoughtWithNoAutoCollapse,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    act(() => {
      root.render(
        <MessageProvider
          message={buildPrimitiveCoTCompletedToolMessage()}
          index={0}
        >
          <MessagePrimitive.Parts
            components={{
              ChainOfThought: ChainOfThoughtWithNoAutoCollapse,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const doneStep = container.querySelector(
      "[data-slot=chain-of-thought-terminal-step-label]",
    );
    expect(doneStep?.textContent).toMatch(/Done in \d+s/);

    const doneStepNode = container.querySelector(
      '[data-slot="chain-of-thought-step"][data-type="complete"][data-status="complete"]',
    );
    expect(doneStepNode).not.toBeNull();

    act(() => {
      root.unmount();
    });
  });

  it("uses ghost variant by default and allows explicit variant override", () => {
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

    const defaultRoot = container.querySelector(
      "[data-slot=chain-of-thought-root]",
    ) as HTMLElement | null;
    expect(defaultRoot?.getAttribute("data-variant")).toBe("ghost");

    act(() => {
      root.render(
        <MessageProvider message={buildPrimitiveCoTMessage()} index={0}>
          <MessagePrimitive.Parts
            components={{
              ChainOfThought: ChainOfThoughtWithToolSummaryAndOutlineVariant,
              Text: ({ text }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });

    const outlinedRoot = container.querySelector(
      "[data-slot=chain-of-thought-root]",
    ) as HTMLElement | null;
    expect(outlinedRoot?.getAttribute("data-variant")).toBe("outline");

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

  it("uses the bullet/default icon type for reasoning steps", () => {
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

    const reasoningStep = Array.from(
      container.querySelectorAll('[data-slot="chain-of-thought-step"]'),
    ).find((step) => step.textContent?.includes("Gathering external context."));

    expect(reasoningStep).not.toBeUndefined();
    expect(reasoningStep?.getAttribute("data-type")).toBe("default");

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

  it('uses "Thinking..." when no step activity label is available', () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChainOfThought.Root defaultOpen>
          <ChainOfThought.Trigger phase="running" />
        </ChainOfThought.Root>,
      );
    });

    const trigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLElement | null;
    expect(trigger?.textContent).toContain("Thinking...");

    act(() => {
      root.unmount();
    });
  });

  it("animates open content height changes when new content is appended", () => {
    const originalResizeObserver = globalThis.ResizeObserver;
    const originalMatchMedia = window.matchMedia;
    let resizeCallback: ResizeObserverCallback | null = null;

    class ResizeObserverMock {
      constructor(cb: ResizeObserverCallback) {
        resizeCallback = cb;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }

    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      writable: true,
      value: ResizeObserverMock,
    });
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: () => ({
        matches: false,
        media: "",
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }),
    });

    const container = document.createElement("div");
    const root = createRoot(container);

    try {
      act(() => {
        root.render(
          <ChainOfThought.Root defaultOpen>
            <ChainOfThought.Trigger reasoningLabel="Reasoning" />
            <ChainOfThought.Content>
              <div>Body</div>
            </ChainOfThought.Content>
          </ChainOfThought.Root>,
        );
      });

      const content = container.querySelector(
        "[data-slot=chain-of-thought-content]",
      ) as HTMLDivElement | null;
      expect(content).not.toBeNull();
      if (!content || !resizeCallback) return;

      let layoutHeight = 100;
      let scrollHeight = 100;

      Object.defineProperty(content, "scrollHeight", {
        configurable: true,
        get: () => scrollHeight,
      });
      content.getBoundingClientRect = (() =>
        ({
          x: 0,
          y: 0,
          width: 0,
          height: layoutHeight,
          top: 0,
          right: 0,
          bottom: layoutHeight,
          left: 0,
          toJSON: () => ({}),
        }) as DOMRect) as typeof content.getBoundingClientRect;

      const makeEntry = (height: number) =>
        ({
          target: content,
          contentRect: {
            x: 0,
            y: 0,
            width: 0,
            height,
            top: 0,
            right: 0,
            bottom: height,
            left: 0,
            toJSON: () => ({}),
          } as DOMRectReadOnly,
        }) as ResizeObserverEntry;

      act(() => {
        resizeCallback?.([makeEntry(100)], {} as ResizeObserver);
      });

      // Simulate post-layout append: element has already grown before observer callback.
      layoutHeight = 150;
      scrollHeight = 150;

      act(() => {
        resizeCallback?.([makeEntry(150)], {} as ResizeObserver);
      });

      expect(content.style.transition).toContain("height");
    } finally {
      act(() => {
        root.unmount();
      });
      if (originalResizeObserver) {
        Object.defineProperty(globalThis, "ResizeObserver", {
          configurable: true,
          writable: true,
          value: originalResizeObserver,
        });
      } else {
        delete (globalThis as { ResizeObserver?: unknown }).ResizeObserver;
      }
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    }
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

  it("supports autoCollapseOnComplete={false}", () => {
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
          autoCollapseOnComplete={false}
        />,
      );
    });

    const openTrigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLElement | null;
    expect(openTrigger?.getAttribute("aria-expanded")).toBe("true");

    const completeTrace = [
      {
        kind: "step" as const,
        id: "step-1",
        label: "Step 1",
        status: "complete" as const,
      },
    ];

    act(() => {
      root.render(
        <ChainOfThought.TraceDisclosure
          trace={completeTrace}
          autoCollapseOnComplete={false}
        />,
      );
    });

    const stillOpenTrigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLElement | null;
    expect(stillOpenTrigger?.getAttribute("aria-expanded")).toBe("true");

    act(() => {
      root.unmount();
    });
  });
});

describe("Crossfade", () => {
  it("is exposed on ChainOfThought as a static component", () => {
    expect(ChainOfThought.Crossfade).toBe(Crossfade);
  });

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

  it("uses a block-level flex wrapper", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <Crossfade value="hello">{(v) => <span>{v}</span>}</Crossfade>,
      );
    });

    const wrapper = container.querySelector(
      "[data-slot=chain-of-thought-crossfade]",
    ) as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.className).toContain("flex");
    expect(wrapper?.className).not.toContain("inline-flex");

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
