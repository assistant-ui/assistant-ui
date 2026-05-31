/**
 * @vitest-environment jsdom
 */
import { act } from "react";
import type { ComponentType, PropsWithChildren } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it } from "vitest";
import {
  AuiProvider,
  MessagePrimitive,
  MessageProvider,
  useAui,
  type ThreadAssistantMessage,
} from "@assistant-ui/react";
import { resource, tapMemo } from "@assistant-ui/tap";
import { ChainOfThought } from "./chain-of-thought";

const StubToolsClient = resource(() =>
  tapMemo(
    () => ({
      getState: () => ({ toolUIs: {}, tools: {} }) as never,
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
    expect(live?.tagName).toBe("OUTPUT");
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

  it("renders the timeline as a native list", () => {
    const running = createToolMessage({
      messageStatus: { type: "running" },
      toolStatus: { type: "running" },
    });
    const view = renderMessageParts(running);

    const list = view.container.querySelector(
      "[data-slot=chain-of-thought-timeline]",
    ) as HTMLElement | null;
    expect(list?.tagName).toBe("UL");

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
