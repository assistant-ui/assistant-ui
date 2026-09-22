import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import {
  AssistantRuntimeProvider,
  AuiConfig,
  defineToolkit,
  Tools,
  useExternalStoreRuntime,
  type ThreadMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { TaskGroup } from "./task-card.aui";
import { Thread, type ThreadComponents } from "./thread.aui";

const THREAD_COMPONENTS: ThreadComponents = { TaskGroup };

const nestedUser = (id: string, text: string) =>
  ({
    id,
    role: "user",
    content: [{ type: "text", text }],
    createdAt: new Date(0),
    attachments: [],
    metadata: { custom: {} },
  }) as unknown as ThreadMessage;

const nestedAssistant = (
  id: string,
  content: ThreadMessageLike["content"],
  status:
    | { type: "running" }
    | { type: "complete"; reason: "stop" }
    | { type: "requires-action"; reason: "tool-calls" },
) =>
  ({
    id,
    role: "assistant",
    content,
    createdAt: new Date(0),
    status,
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as unknown as ThreadMessage;

const task = (
  id: string,
  description: string,
  options: {
    messages: readonly ThreadMessage[];
    result?: unknown;
    isError?: boolean;
    approval?: { id: string };
  },
) => ({
  type: "tool-call" as const,
  toolCallId: id,
  toolName: "task",
  args: { description, subagent_type: "researcher" },
  messages: options.messages,
  ...(options.result !== undefined && { result: options.result }),
  ...(options.isError && { isError: true }),
  ...(options.approval !== undefined && { approval: options.approval }),
});

const settled = (id: string, text: string) => [
  nestedUser(`${id}-user`, "Go"),
  nestedAssistant(`${id}-assistant`, [{ type: "text", text }], {
    type: "complete",
    reason: "stop",
  }),
];

const fanOut = (): ThreadMessageLike[] => [
  { role: "user", content: "Look into it" },
  {
    role: "assistant",
    content: [
      task("t1", "Explore the runtime", {
        messages: [
          nestedUser("t1-user", "Go"),
          nestedAssistant("t1-assistant", [{ type: "text", text: "Reading" }], {
            type: "running",
          }),
        ],
      }),
      task("t2", "Summarize findings", {
        messages: [
          nestedUser("t2-user", "Go"),
          nestedAssistant(
            "t2-assistant",
            [
              { type: "text", text: "Found it" },
              task("t2-nested", "Check the docs", {
                messages: settled("t2-nested", "Docs agree"),
                result: "agreed",
              }),
            ],
            { type: "complete", reason: "stop" },
          ),
        ],
        result: "Found the runtime in packages/core",
      }),
      task("t3", "Run the suite", {
        messages: settled("t3", "Failed"),
        result: "boom",
        isError: true,
      }),
      task("t4", "Update the docs", {
        messages: settled("t4", "Updated"),
        result: "ok",
      }),
      task("t5", "Ping the owner", {
        messages: settled("t5", "Pinged"),
        result: "ok",
      }),
    ],
  },
];

function TestThread({
  messages,
  config,
  slot = true,
}: {
  messages: ThreadMessageLike[];
  config?: ReturnType<typeof AuiConfig>;
  slot?: boolean;
}) {
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message) => message,
    isRunning: false,
    onNew: async () => {},
  });

  return (
    <AssistantRuntimeProvider runtime={runtime} config={config}>
      <Thread
        autoFocus={false}
        components={slot ? THREAD_COMPONENTS : undefined}
      />
    </AssistantRuntimeProvider>
  );
}

const cards = () => [
  ...document.querySelectorAll<HTMLElement>('[data-slot="task-card"]'),
];

beforeAll(() => {
  HTMLElement.prototype.scrollTo ??= () => {};
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

afterEach(async () => {
  await act(async () => {
    cleanup();
  });
  document.body.replaceChildren();
});

describe("TaskGroup", () => {
  it("renders the delegated tasks of a message as paginated lanes", () => {
    render(<TestThread messages={fanOut()} />);

    expect(screen.getByText("5 tasks · 1 running · 1 failed")).toBeTruthy();
    expect(cards()).toHaveLength(4);
    expect(cards().map((card) => card.getAttribute("data-state"))).toEqual([
      "working",
      "done",
      "failed",
      "done",
    ]);
    expect(screen.getByText("Explore the runtime")).toBeTruthy();
    expect(screen.getAllByText("researcher")).toHaveLength(4);
    expect(screen.getByText("Found the runtime in packages/core")).toBeTruthy();
    expect(screen.queryByText("Ping the owner")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Show 1 more" }));

    expect(cards()).toHaveLength(5);
    expect(screen.getByText("Ping the owner")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Show \d+ more/ })).toBeNull();
  });

  it("opens the nested transcript on demand and renders nested tasks inside it", () => {
    render(<TestThread messages={fanOut()} />);

    expect(screen.queryByText("Found it")).toBeNull();

    const card = cards()[1]!;
    const toggle = within(card).getByRole("button", { expanded: false });
    fireEvent.click(toggle);

    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const transcript = within(card).getAllByText("Found it")[0]!;
    expect(transcript).toBeTruthy();
    expect(within(card).getByText("instruction")).toBeTruthy();
    expect(within(card).getAllByText("agent").length).toBeGreaterThan(0);
    const nested = within(card).getByText("Check the docs");
    expect(nested.closest('[data-slot="task-card"]')).not.toBe(card);
    expect(
      screen.queryByText("5 tasks · 1 running · 1 failed", { exact: true }),
    ).toBeTruthy();
  });

  it("renders a single delegation without a group summary", () => {
    render(
      <TestThread
        messages={[
          { role: "user", content: "Look into it" },
          {
            role: "assistant",
            content: [
              task("solo", "Explore the runtime", {
                messages: settled("solo", "Done"),
                result: "ok",
              }),
            ],
          },
        ]}
      />,
    );

    expect(cards()).toHaveLength(1);
    expect(document.querySelector('[data-slot="aui_task-group"]')).toBeNull();
    expect(
      cards()[0]!.querySelector('[data-slot="task-card-result"]')?.textContent,
    ).toBe("ok");
  });

  it("renders delegations through the tool group when the slot is not set", () => {
    render(<TestThread messages={fanOut()} slot={false} />);

    expect(cards()).toHaveLength(0);
    expect(document.querySelector('[data-slot="aui_task-group"]')).toBeNull();
    expect(screen.getByRole("button", { name: "5 tool calls" })).toBeTruthy();
  });

  it("keeps the approval controls on a lane that waits for input", () => {
    render(
      <TestThread
        messages={[
          { role: "user", content: "Look into it" },
          {
            role: "assistant",
            content: [
              task("pending", "Ship the release", {
                messages: settled("pending", "Ready to ship"),
              }),
            ],
          },
        ]}
      />,
    );

    const card = cards()[0]!;
    expect(card.getAttribute("data-state")).toBe("waiting");
    const actions = card.querySelector('[data-slot="task-card-actions"]');
    expect(actions).toBeTruthy();
    expect(
      within(actions as HTMLElement).getAllByRole("button").length,
    ).toBeGreaterThan(0);
  });

  it("renders a call waiting inside a transcript without controls", () => {
    render(
      <TestThread
        messages={[
          { role: "user", content: "Look into it" },
          {
            role: "assistant",
            content: [
              task("outer", "Coordinate the release", {
                messages: [
                  nestedUser("outer-user", "Go"),
                  nestedAssistant(
                    "outer-assistant",
                    [
                      task("gated", "Tag the release", {
                        messages: [],
                        approval: { id: "nested-approval" },
                      }),
                      {
                        type: "tool-call",
                        toolCallId: "lookup",
                        toolName: "lookup",
                        args: {},
                        argsText: "{}",
                      },
                      {
                        type: "tool-call",
                        toolCallId: "confirm",
                        toolName: "confirm",
                        args: {},
                        argsText: "{}",
                        interrupt: { type: "human", payload: {} },
                      },
                    ],
                    { type: "requires-action", reason: "tool-calls" },
                  ),
                ],
                result: "handed back",
              }),
            ],
          },
        ]}
      />,
    );

    const outer = cards()[0]!;
    fireEvent.click(within(outer).getByRole("button", { expanded: false }));

    const nested = within(outer)
      .getByText("Tag the release")
      .closest('[data-slot="task-card"]');
    expect(nested?.getAttribute("data-state")).toBe("waiting");
    expect(
      within(outer).getByRole("button", { name: "Waiting on tool: lookup" }),
    ).toBeTruthy();
    expect(
      within(outer).getByRole("button", { name: "Waiting on tool: confirm" }),
    ).toBeTruthy();
    expect(
      within(outer).queryAllByRole("button", { name: "Allow" }),
    ).toHaveLength(0);
  });

  it("shows the error text of a failed lane and reads a cancelled call as cancelled", () => {
    render(
      <TestThread
        messages={[
          { role: "user", content: "Look into it" },
          {
            role: "assistant",
            status: { type: "incomplete", reason: "error", error: "boom" },
            content: [
              task("broken", "Run the suite", {
                messages: settled("broken", "Crashed"),
              }),
            ],
          },
          { role: "user", content: "Try again" },
          {
            role: "assistant",
            status: { type: "incomplete", reason: "cancelled" },
            content: [
              task("stopped", "Ping the owner", {
                messages: settled("stopped", "Stopped"),
              }),
            ],
          },
        ]}
      />,
    );

    const [broken, stopped] = cards();
    expect(broken?.getAttribute("data-state")).toBe("failed");
    expect(
      broken?.querySelector('[data-slot="task-card-result"]')?.textContent,
    ).toBe("Error:boom");
    expect(stopped?.getAttribute("data-state")).toBe("cancelled");
    expect(stopped?.querySelector('[data-slot="task-card-result"]')).toBeNull();
  });

  it("renders no action strip on the siblings of an interrupted call or on a resolved approval", () => {
    render(
      <TestThread
        messages={[
          { role: "user", content: "Look into it" },
          {
            role: "assistant",
            status: { type: "requires-action", reason: "interrupt" },
            content: [
              task("a", "Explore the runtime", { messages: settled("a", "A") }),
              {
                ...task("b", "Summarize findings", {
                  messages: settled("b", "B"),
                }),
                approval: { id: "b", approved: true },
              },
            ],
          },
        ]}
      />,
    );

    expect(cards()).toHaveLength(2);
    expect(cards().map((card) => card.getAttribute("data-state"))).toEqual([
      "waiting",
      "waiting",
    ]);
    expect(
      document.querySelector('[data-slot="task-card-actions"]'),
    ).toBeNull();
  });

  it("keeps counting elapsed time while a lane waits for input", () => {
    vi.useFakeTimers();
    try {
      const now = new Date("2026-09-16T00:01:05Z").getTime();
      vi.setSystemTime(now);
      render(
        <TestThread
          messages={[
            { role: "user", content: "Look into it" },
            {
              role: "assistant",
              content: [
                {
                  ...task("pending", "Ship the release", {
                    messages: settled("pending", "Ready to ship"),
                  }),
                  timing: { startedAt: now - 5_000 },
                },
              ],
            },
          ]}
        />,
      );

      expect(cards()[0]?.getAttribute("data-state")).toBe("waiting");
      expect(within(cards()[0]!).getByText("5.0s")).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(within(cards()[0]!).getByText("6.0s")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves an MCP app call to the standalone path", () => {
    render(
      <TestThread
        messages={[
          { role: "user", content: "Look into it" },
          {
            role: "assistant",
            content: [
              {
                ...task("app", "Open the widget", {
                  messages: settled("app", "Opened"),
                  result: "ok",
                }),
                mcp: { app: { resourceUri: "ui://widget" } },
              },
            ],
          },
        ]}
      />,
    );

    expect(cards()).toHaveLength(0);
    expect(document.querySelector('[data-slot="aui_task-group"]')).toBeNull();
    expect(
      document.querySelector('[data-slot="tool-fallback-root"]'),
    ).toBeTruthy();
  });

  it("formats an unserializable result without throwing", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;

    render(
      <TestThread
        messages={[
          { role: "user", content: "Look into it" },
          {
            role: "assistant",
            content: [
              task("solo", "Explore the runtime", {
                messages: settled("solo", "Done"),
                result: cyclic,
              }),
            ],
          },
        ]}
      />,
    );

    expect(
      cards()[0]!.querySelector('[data-slot="task-card-result"]')?.textContent,
    ).toBe("[object Object]");
  });

  it("leaves tool calls with a registered UI to that UI", () => {
    const config = AuiConfig({
      tools: Tools({
        toolkit: defineToolkit({
          task: { type: "backend", render: () => <div>Custom task UI</div> },
        }),
      }),
    });

    render(<TestThread messages={fanOut()} config={config} />);

    expect(cards()).toHaveLength(0);
    expect(document.querySelector('[data-slot="aui_task-group"]')).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "5 tool calls" }));

    expect(screen.getAllByText("Custom task UI")).toHaveLength(5);
  });
});
