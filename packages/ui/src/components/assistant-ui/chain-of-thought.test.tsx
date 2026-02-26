/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import type { ComponentType } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import {
  MessagePrimitive,
  MessageProvider,
  type ThreadAssistantMessage,
} from "@assistant-ui/react";
import { ChainOfThought, type TraceNode } from "./chain-of-thought";

const globalWithAct = globalThis as typeof globalThis & {
  IS_REACT_ACT_ENVIRONMENT?: boolean;
};
globalWithAct.IS_REACT_ACT_ENVIRONMENT = true;

let messageId = 0;

const createMetadata = () => ({
  unstable_state: null,
  unstable_annotations: [],
  unstable_data: [],
  steps: [],
  custom: {},
});

const createAssistantMessage = ({
  content,
  status,
}: {
  content: any[];
  status: { type: string; reason?: string };
}): ThreadAssistantMessage => ({
  id: `message-${messageId++}`,
  role: "assistant",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  content: content as any,
  status: status as any,
  metadata: createMetadata(),
});

const createReasoningMessage = (
  status: { type: string; reason?: string } = {
    type: "complete",
    reason: "stop",
  },
) =>
  createAssistantMessage({
    status,
    content: [
      { type: "reasoning", text: "Planning the response." },
      { type: "text", text: "Final answer." },
    ],
  });

const createToolMessage = ({
  messageStatus = { type: "complete", reason: "stop" },
  toolStatus,
  argsText = '{"query":"assistant-ui"}',
  result,
}: {
  messageStatus?: { type: string; reason?: string };
  toolStatus?: { type: string; reason?: string };
  argsText?: string;
  result?: unknown;
} = {}) =>
  createAssistantMessage({
    status: messageStatus,
    content: [
      { type: "reasoning", text: "Gathering context." },
      {
        type: "tool-call",
        toolCallId: "tool-1",
        toolName: "search_web",
        args: { query: "assistant-ui" },
        argsText,
        ...(toolStatus ? { status: toolStatus } : {}),
        ...(result !== undefined ? { result } : {}),
      },
      { type: "text", text: "Synthesizing findings." },
    ],
  });

const ChainOfThoughtNoAutoCollapse = () => (
  <ChainOfThought autoCollapseOnComplete={false} />
);

const ChainOfThoughtCustomActivity = () => (
  <ChainOfThought
    toolActivityLabels={{
      search_web: ({ statusType }: { statusType?: string }) =>
        statusType === "running" ? "Custom searching..." : "Custom searched.",
    }}
  />
);

const ChainOfThoughtCustomTrigger = () => (
  <ChainOfThought
    renderTriggerContent={({ phase, isOpen, activityLabel }) => (
      <span data-slot="custom-trigger-content">
        phase:{phase}|open:{String(isOpen)}|activity:{activityLabel ?? "none"}
      </span>
    )}
  />
);

const renderMessageParts = (
  message: ThreadAssistantMessage,
  ChainOfThoughtComponent: ComponentType = ChainOfThought,
) => {
  const container = document.createElement("div");
  const root = createRoot(container);

  const renderWith = (
    nextMessage: ThreadAssistantMessage,
    Component: ComponentType = ChainOfThoughtComponent,
  ) => {
    act(() => {
      root.render(
        <MessageProvider message={nextMessage} index={0}>
          <MessagePrimitive.Parts
            components={{
              ChainOfThought: Component,
              Text: ({ text }: { text: string }) => <p>{text}</p>,
            }}
          />
        </MessageProvider>,
      );
    });
  };

  renderWith(message, ChainOfThoughtComponent);

  return {
    container,
    rerender: renderWith,
    unmount: () => {
      act(() => root.unmount());
    },
  };
};

describe("ChainOfThought (80/20 integration contracts)", () => {
  it("is collapsed by default for completed reasoning", () => {
    const view = renderMessageParts(createReasoningMessage());

    const trigger = view.container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;

    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");
    expect(trigger?.textContent).toContain("Reasoning");

    view.unmount();
  });

  it("auto-opens while chain-of-thought is running", () => {
    const runningMessage = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const view = renderMessageParts(runningMessage);

    const trigger = view.container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;

    expect(trigger?.getAttribute("aria-expanded")).toBe("true");
    expect(trigger?.textContent).toContain("Searching");

    view.unmount();
  });

  it("auto-collapses after streaming completes by default", () => {
    const runningMessage = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const completeMessage = createToolMessage({
      messageStatus: { type: "complete", reason: "stop" },
      toolStatus: { type: "complete", reason: "stop" },
      result: { hits: 2 },
    });
    const view = renderMessageParts(runningMessage);

    const trigger = view.container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    view.rerender(completeMessage);
    expect(trigger?.getAttribute("aria-expanded")).toBe("false");

    view.unmount();
  });

  it("keeps disclosure open after completion when autoCollapseOnComplete is false", () => {
    const runningMessage = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const completeMessage = createToolMessage({
      messageStatus: { type: "complete", reason: "stop" },
      toolStatus: { type: "complete", reason: "stop" },
      result: { hits: 2 },
    });
    const view = renderMessageParts(
      runningMessage,
      ChainOfThoughtNoAutoCollapse,
    );

    const trigger = view.container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    view.rerender(completeMessage, ChainOfThoughtNoAutoCollapse);
    expect(trigger?.getAttribute("aria-expanded")).toBe("true");

    view.unmount();
  });

  it("supports custom activity labels", () => {
    const runningMessage = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const completeMessage = createToolMessage({
      messageStatus: { type: "complete", reason: "stop" },
      toolStatus: { type: "complete", reason: "stop" },
      result: { hits: 2 },
    });
    const view = renderMessageParts(
      runningMessage,
      ChainOfThoughtCustomActivity,
    );

    expect(view.container.textContent).toContain("Custom searching...");

    view.rerender(completeMessage, ChainOfThoughtCustomActivity);
    expect(view.container.textContent).toContain("Custom searched.");

    view.unmount();
  });

  it("allows UI-layer trigger rendering", () => {
    const runningMessage = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const completeMessage = createToolMessage({
      messageStatus: { type: "complete", reason: "stop" },
      toolStatus: { type: "complete", reason: "stop" },
      result: { hits: 1 },
    });
    const view = renderMessageParts(
      runningMessage,
      ChainOfThoughtCustomTrigger,
    );

    const custom = view.container.querySelector(
      "[data-slot=custom-trigger-content]",
    ) as HTMLElement | null;
    expect(custom?.textContent).toContain("phase:running|open:true");

    view.rerender(completeMessage, ChainOfThoughtCustomTrigger);
    expect(custom?.textContent).toContain("phase:complete|open:false");

    view.unmount();
  });

  it("expands tool details and keeps outer disclosure open", () => {
    const runningMessage = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const view = renderMessageParts(runningMessage);

    const outerTrigger = view.container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;
    expect(outerTrigger?.getAttribute("aria-expanded")).toBe("true");

    const toolTrigger = view.container.querySelector(
      "[data-slot=chain-of-thought-tool-activity-trigger]",
    ) as HTMLButtonElement | null;
    act(() => toolTrigger?.click());

    expect(toolTrigger?.getAttribute("aria-expanded")).toBe("true");
    expect(outerTrigger?.getAttribute("aria-expanded")).toBe("true");
    expect(view.container.textContent).toContain('"query":"assistant-ui"');

    view.unmount();
  });

  it("disables tool detail disclosure when there is no detail content", () => {
    const runningMessage = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
      argsText: "",
    });
    const view = renderMessageParts(runningMessage);

    const toolTrigger = view.container.querySelector(
      "[data-slot=chain-of-thought-tool-activity-trigger]",
    ) as HTMLButtonElement | null;

    expect(toolTrigger?.hasAttribute("disabled")).toBe(true);

    view.unmount();
  });

  it("emits incomplete phase in custom trigger content", () => {
    const incompleteMessage = createToolMessage({
      messageStatus: { type: "incomplete", reason: "error" },
      toolStatus: { type: "incomplete", reason: "error" },
    });
    const view = renderMessageParts(
      incompleteMessage,
      ChainOfThoughtCustomTrigger,
    );

    const custom = view.container.querySelector(
      "[data-slot=custom-trigger-content]",
    ) as HTMLElement | null;
    expect(custom?.textContent).toContain("phase:incomplete|open:false");

    view.unmount();
  });
});

describe("ChainOfThought.TraceDisclosure", () => {
  it("locks nested group expansion while streaming and unlocks after completion", () => {
    const runningTrace: TraceNode[] = [
      {
        kind: "group",
        id: "group-1",
        label: "Searching",
        status: "running",
        children: [
          {
            kind: "step",
            id: "step-1",
            label: "Tool: search_web",
            status: "running",
            toolName: "search_web",
          },
        ],
      } as TraceNode,
    ];
    const completeTrace: TraceNode[] = [
      {
        kind: "group",
        id: "group-1",
        label: "Searching",
        status: "complete",
        children: [
          {
            kind: "step",
            id: "step-1",
            label: "Tool: search_web",
            status: "complete",
            toolName: "search_web",
          },
        ],
      } as TraceNode,
    ];

    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<ChainOfThought.TraceDisclosure trace={runningTrace} />);
    });

    const runningGroupSummary = container.querySelector(
      "[data-slot=chain-of-thought-trace-group-summary]",
    ) as HTMLButtonElement | null;
    expect(runningGroupSummary?.hasAttribute("disabled")).toBe(true);

    act(() => {
      root.render(<ChainOfThought.TraceDisclosure trace={completeTrace} />);
    });

    const disclosureTrigger = container.querySelector(
      "[data-slot=chain-of-thought-trigger]",
    ) as HTMLButtonElement | null;
    act(() => disclosureTrigger?.click());

    const groupSummary = container.querySelector(
      "[data-slot=chain-of-thought-trace-group-summary]",
    ) as HTMLButtonElement | null;
    expect(groupSummary?.hasAttribute("disabled")).toBe(false);
    act(() => groupSummary?.click());
    expect(groupSummary?.getAttribute("aria-expanded")).toBe("true");

    act(() => root.unmount());
  });
});
