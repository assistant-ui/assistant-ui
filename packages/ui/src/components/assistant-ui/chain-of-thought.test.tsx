/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import type { ComponentType, PropsWithChildren } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";
import {
  AuiProvider,
  MessagePrimitive,
  MessageProvider,
  useAui,
  type ThreadAssistantMessage,
} from "@assistant-ui/react";
import { resource, tapMemo } from "@assistant-ui/tap";
import { ChainOfThought, type TraceNode } from "./chain-of-thought";
import { ChainOfThoughtToolBadge } from "./chain-of-thought/step";
import { useTraceDuration } from "./chain-of-thought/trace-time";

const StubToolsClient = resource(() =>
  tapMemo(
    () => ({
      getState: () => ({ tools: {} }) as never,
      setToolUI: () => () => {},
    }),
    [],
  ),
);

const ToolsScope = ({ children }: PropsWithChildren) => {
  const aui = useAui({ tools: StubToolsClient() });
  return <AuiProvider value={aui}>{children}</AuiProvider>;
};

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
        <ToolsScope>
          <MessageProvider message={nextMessage} index={0}>
            <MessagePrimitive.Parts
              components={{
                ChainOfThought: Component,
                Text: ({ text }: { text: string }) => <p>{text}</p>,
              }}
            />
          </MessageProvider>
        </ToolsScope>,
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

  it("uses the root open state for custom trigger rendering", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChainOfThought.Root open={false} onOpenChange={() => {}}>
          <ChainOfThought.Trigger
            isOpen={true}
            renderTriggerContent={({ isOpen }) => (
              <span data-slot="custom-open-state">{String(isOpen)}</span>
            )}
          />
        </ChainOfThought.Root>,
      );
    });

    const custom = container.querySelector(
      "[data-slot=custom-open-state]",
    ) as HTMLElement | null;
    expect(custom?.textContent).toBe("false");

    act(() => {
      root.unmount();
    });
  });

  it("defaults the composable root to the ghost variant", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChainOfThought.Root>
          <ChainOfThought.Trigger />
        </ChainOfThought.Root>,
      );
    });

    const rootEl = container.querySelector(
      "[data-slot=chain-of-thought-root]",
    ) as HTMLDivElement | null;

    expect(rootEl?.className).toContain("bg-transparent");
    expect(rootEl?.className).not.toContain("border");

    act(() => {
      root.unmount();
    });
  });

  it("uses instant auto-scroll when reduced motion is requested", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const originalMatchMedia = window.matchMedia;
    const originalScrollTo = HTMLElement.prototype.scrollTo;
    const scrollTo = vi.fn();

    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        media: "(prefers-reduced-motion: reduce)",
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }),
    });
    Object.defineProperty(HTMLElement.prototype, "scrollTo", {
      configurable: true,
      writable: true,
      value: scrollTo,
    });

    try {
      act(() => {
        root.render(
          <ChainOfThought.Timeline
            autoScroll
            autoScrollKey={1}
            autoScrollBehavior="smooth"
          >
            <ChainOfThought.Step status="active">
              <ChainOfThought.StepHeader>Working</ChainOfThought.StepHeader>
              <ChainOfThought.StepBody>
                Streaming update
              </ChainOfThought.StepBody>
            </ChainOfThought.Step>
          </ChainOfThought.Timeline>,
        );
      });

      expect(scrollTo).toHaveBeenCalledWith(
        expect.objectContaining({ behavior: "auto" }),
      );
    } finally {
      act(() => root.unmount());
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
      Object.defineProperty(HTMLElement.prototype, "scrollTo", {
        configurable: true,
        writable: true,
        value: originalScrollTo,
      });
    }
  });

  it("suppresses the running tool badge spinner for reduced motion", () => {
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChainOfThoughtToolBadge toolName="search_web" status="running" />,
      );
    });

    expect(
      container
        .querySelector(".aui-chain-of-thought-tool-badge-spinner")
        ?.className.includes("motion-reduce:animate-none"),
    ).toBe(true);

    act(() => root.unmount());
  });

  it("captures trace duration when mounted already streaming", () => {
    const container = document.createElement("div");
    const root = createRoot(container);
    const now = vi.spyOn(Date, "now");

    const DurationProbe = ({ isStreaming }: { isStreaming: boolean }) => {
      const duration = useTraceDuration(isStreaming);

      return <span data-slot="trace-duration">{duration ?? "none"}</span>;
    };

    try {
      now.mockReturnValue(1_000);
      act(() => {
        root.render(<DurationProbe isStreaming />);
      });

      now.mockReturnValue(3_400);
      act(() => {
        root.render(<DurationProbe isStreaming={false} />);
      });

      expect(
        container.querySelector("[data-slot=trace-duration]")?.textContent,
      ).toBe("2");
    } finally {
      now.mockRestore();
      act(() => root.unmount());
    }
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
  it("surfaces incomplete static traces in the collapsed trigger", () => {
    const incompleteTrace: TraceNode[] = [
      {
        kind: "step",
        id: "failed",
        label: "Build failed",
        status: "incomplete",
      },
    ];
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(
        <ChainOfThought.TraceDisclosure
          trace={incompleteTrace}
          triggerProps={{
            renderTriggerContent: ({ phase, activityLabel }) => (
              <span data-slot="trace-trigger-state">
                {phase}|{activityLabel}
              </span>
            ),
          }}
        />,
      );
    });

    const triggerState = container.querySelector(
      "[data-slot=trace-trigger-state]",
    ) as HTMLElement | null;
    expect(triggerState?.textContent).toBe("incomplete|Stopped after 1 step");

    act(() => root.unmount());
  });

  it("renders trace group summary latestLabel", () => {
    const trace: TraceNode[] = [
      {
        kind: "group",
        id: "research",
        label: "Research",
        status: "complete",
        summary: { latestLabel: "Override summary label" },
        children: [
          {
            kind: "step",
            id: "read",
            label: "Read source files",
            status: "complete",
          },
        ],
      },
    ];
    const container = document.createElement("div");
    const root = createRoot(container);

    act(() => {
      root.render(<ChainOfThought.Trace trace={trace} />);
    });

    const groupSummary = container.querySelector(
      "[data-slot=chain-of-thought-trace-group-summary]",
    ) as HTMLElement | null;
    expect(groupSummary?.textContent).toContain("Override summary label");

    act(() => root.unmount());
  });

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
      root.render(
        <ChainOfThought.TraceDisclosure
          trace={runningTrace}
          allowGroupExpand={true}
        />,
      );
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

describe("ChainOfThought accessibility & i18n", () => {
  it("exposes a polite live-status region announcing activity and completion", () => {
    const running = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const complete = createToolMessage({
      messageStatus: { type: "complete", reason: "stop" },
      toolStatus: { type: "complete", reason: "stop" },
      result: { hits: 2 },
    });
    const view = renderMessageParts(running);

    const live = view.container.querySelector(
      "[data-slot=chain-of-thought-live-status]",
    ) as HTMLElement | null;
    expect(live?.getAttribute("role")).toBe("status");
    expect(live?.getAttribute("aria-live")).toBe("polite");
    expect(live?.textContent).toContain("Searching");

    view.rerender(complete);
    expect(
      view.container.querySelector("[data-slot=chain-of-thought-live-status]")
        ?.textContent,
    ).toContain("Done");

    view.unmount();
  });

  it("marks the content region aria-busy while streaming", () => {
    const running = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const complete = createToolMessage({
      messageStatus: { type: "complete", reason: "stop" },
      toolStatus: { type: "complete", reason: "stop" },
      result: { hits: 1 },
    });
    const view = renderMessageParts(running);

    expect(
      view.container
        .querySelector("[data-slot=chain-of-thought-content]")
        ?.getAttribute("aria-busy"),
    ).toBe("true");

    view.rerender(complete);
    const content = view.container.querySelector(
      "[data-slot=chain-of-thought-content]",
    );
    // After completion the panel collapses (content may unmount); if present it
    // must no longer report busy.
    expect(
      content === null || content.getAttribute("aria-busy") === "false",
    ).toBe(true);

    view.unmount();
  });

  it("marks the timeline with role=list so list semantics survive Preflight", () => {
    const running = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const view = renderMessageParts(running);

    const list = view.container.querySelector(
      "[data-slot=chain-of-thought-timeline]",
    ) as HTMLElement | null;
    expect(list?.getAttribute("role")).toBe("list");

    view.unmount();
  });

  it("surfaces the requires-action phase through the selectors", () => {
    const message = createToolMessage({
      messageStatus: { type: "requires-action" },
      toolStatus: { type: "requires-action" },
    });
    const view = renderMessageParts(message, ChainOfThoughtCustomTrigger);

    const custom = view.container.querySelector(
      "[data-slot=custom-trigger-content]",
    ) as HTMLElement | null;
    expect(custom?.textContent).toContain("phase:requires-action");

    view.unmount();
  });

  it("does not render the panel for a message with no chain parts (idle)", () => {
    const textOnly = createAssistantMessage({
      status: { type: "complete", reason: "stop" },
      content: [{ type: "text", text: "Just an answer." }],
    });
    const view = renderMessageParts(textOnly);

    expect(
      view.container.querySelector("[data-slot=chain-of-thought-trigger]"),
    ).toBeNull();

    view.unmount();
  });

  it("applies string overrides to the trigger and live region", () => {
    const running = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const complete = createToolMessage({
      messageStatus: { type: "complete", reason: "stop" },
      toolStatus: { type: "complete", reason: "stop" },
    });
    const Localized = () => (
      <ChainOfThought
        strings={{ reasoning: "Razonamiento", done: () => "Listo" }}
      />
    );
    const view = renderMessageParts(running, Localized);

    expect(
      view.container.querySelector("[data-slot=chain-of-thought-trigger]")
        ?.textContent,
    ).toContain("Razonamiento");

    view.rerender(complete, Localized);
    expect(
      view.container.querySelector("[data-slot=chain-of-thought-live-status]")
        ?.textContent,
    ).toContain("Listo");

    view.unmount();
  });

  it("moves focus to the trigger when auto-collapse removes focused content", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    const renderMsg = (message: ThreadAssistantMessage) =>
      act(() => {
        root.render(
          <ToolsScope>
            <MessageProvider message={message} index={0}>
              <MessagePrimitive.Parts
                components={{
                  ChainOfThought,
                  Text: ({ text }: { text: string }) => <p>{text}</p>,
                }}
              />
            </MessageProvider>
          </ToolsScope>,
        );
      });

    const running = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const complete = createToolMessage({
      messageStatus: { type: "complete", reason: "stop" },
      toolStatus: { type: "complete", reason: "stop" },
      result: { hits: 1 },
    });

    try {
      renderMsg(running);
      const toolTrigger = container.querySelector(
        "[data-slot=chain-of-thought-tool-activity-trigger]",
      ) as HTMLButtonElement | null;
      act(() => toolTrigger?.focus());
      expect(container.contains(document.activeElement)).toBe(true);

      renderMsg(complete);
      const chainTrigger = container.querySelector(
        "[data-slot=chain-of-thought-trigger]",
      ) as HTMLButtonElement | null;
      // Focus must land on the trigger, not fall back to <body>.
      expect(document.activeElement).toBe(chainTrigger);
    } finally {
      act(() => root.unmount());
      document.body.removeChild(container);
    }
  });
});
