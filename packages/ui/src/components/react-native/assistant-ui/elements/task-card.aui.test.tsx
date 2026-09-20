import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Text } from "react-native";
import {
  AssistantRuntimeProvider,
  MessageByIndexProvider,
  MessagePrimitive,
  useExternalStoreRuntime,
  type ThreadMessage,
  type ThreadMessageLike,
} from "@assistant-ui/react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("uniwind", async (importOriginal) => ({
  ...(await importOriginal<typeof import("uniwind")>()),
  withUniwind: (Component: unknown) => Component,
}));

vi.mock("./markdown-text", () => ({
  MarkdownText: ({ text }: { text: string }) => <Text>{text}</Text>,
}));

import { isTaskPart, TaskGroup } from "./task-card.aui";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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
  status: { type: "running" } | { type: "complete"; reason: "stop" },
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
  },
) => ({
  type: "tool-call" as const,
  toolCallId: id,
  toolName: "task",
  args: { description, subagent_type: "researcher" },
  messages: options.messages,
  ...(options.result !== undefined && { result: options.result }),
  ...(options.isError && { isError: true }),
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

const GroupHarness = ({ messages }: { messages: ThreadMessageLike[] }) => {
  const runtime = useExternalStoreRuntime({
    messages,
    convertMessage: (message) => message,
    isRunning: false,
    onNew: async () => {},
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <MessageByIndexProvider index={1}>
        <MessagePrimitive.GroupedParts
          indicator="never"
          groupBy={(part) =>
            part.type === "tool-call" && part.messages !== undefined
              ? ["group-chainOfThought", "group-task"]
              : []
          }
        >
          {({ part, children }) => {
            if (part.type === "group-task") return <TaskGroup group={part} />;
            if (part.type.startsWith("group-")) return children;
            return null;
          }}
        </MessagePrimitive.GroupedParts>
      </MessageByIndexProvider>
    </AssistantRuntimeProvider>
  );
};

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("TaskGroup", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const render = async (messages: ThreadMessageLike[]) => {
    await act(async () => {
      root.render(<GroupHarness messages={messages} />);
    });
  };

  const cardHeaders = () =>
    [
      ...container.querySelectorAll<HTMLElement>(
        '[role="button"][aria-label]',
      ),
    ].filter((element) => /, (working|waiting|done|failed|cancelled)$/.test(element.getAttribute("aria-label") ?? ""));

  const button = (label: string) =>
    [...container.querySelectorAll<HTMLElement>('[role="button"]')].find(
      (element) => element.textContent === label,
    ) as HTMLElement;

  it("summarizes and pages delegated task cards", async () => {
    await render(fanOut());

    expect(container.textContent).toContain("5 tasks · 1 running · 1 failed");
    expect(cardHeaders()).toHaveLength(4);
    expect(container.textContent).not.toContain("Ping the owner");

    await act(async () => {
      click(button("Show 1 more"));
    });

    expect(cardHeaders()).toHaveLength(5);
    expect(container.textContent).toContain("Ping the owner");
    expect(button("Show 1 more")).toBeUndefined();
  });

  it("mounts a nested transcript and nested task only while a card is open", async () => {
    await render(fanOut());

    const header = container.querySelector(
      '[aria-label="Summarize findings, done"]',
    ) as HTMLElement;
    expect(container.textContent).not.toContain("Found it");

    await act(async () => {
      click(header);
    });

    expect(container.textContent).toContain("instruction");
    expect(container.textContent).toContain("agent");
    expect(container.textContent).toContain("Found it");
    expect(
      container.querySelector('[aria-label="Check the docs, done"]'),
    ).not.toBeNull();

    await act(async () => {
      click(header);
    });
    expect(container.textContent).not.toContain("Found it");
    expect(
      container.querySelector('[aria-label="Check the docs, done"]'),
    ).toBeNull();
  });

  it("renders string results once and object results as indented JSON", async () => {
    await render([
      { role: "user", content: "Look into it" },
      {
        role: "assistant",
        content: [
          task("string", "String result", {
            messages: settled("string", "Done"),
            result: "A single result",
          }),
          task("object", "Object result", {
            messages: settled("object", "Done"),
            result: { answer: 42 },
          }),
        ],
      },
    ]);

    expect(container.textContent?.match(/A single result/g)).toHaveLength(1);
    expect(container.textContent).toContain('{\n  "answer": 42\n}');
  });

  it("renders failed task errors", async () => {
    await render([
      { role: "user", content: "Look into it" },
      {
        role: "assistant",
        status: { type: "incomplete", reason: "error", error: "boom" },
        content: [
          task("broken", "Run the suite", { messages: settled("broken", "Crashed") }),
        ],
      },
    ]);

    expect(container.textContent).toContain("Error:");
    expect(container.textContent).toContain("boom");
  });

  it("renders cancelled task reasons", async () => {
    await render([
      { role: "user", content: "Try again" },
      {
        role: "assistant",
        status: { type: "incomplete", reason: "cancelled", error: "cancelled" },
        content: [
          task("stopped", "Ping the owner", { messages: settled("stopped", "Stopped") }),
        ],
      },
    ]);

    expect(container.textContent).toContain("Cancelled reason:");
  });

  it("renders one delegation without a summary", async () => {
    await render([
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
    ]);

    expect(cardHeaders()).toHaveLength(1);
    expect(container.textContent).not.toContain("1 tasks");
  });
});

describe("isTaskPart", () => {
  it("recognizes only tool calls that carry nested messages", () => {
    expect(isTaskPart({ type: "tool-call", messages: [] })).toBe(true);
    expect(isTaskPart({ type: "tool-call" })).toBe(false);
    expect(isTaskPart({ type: "text", messages: [] })).toBe(false);
  });
});
