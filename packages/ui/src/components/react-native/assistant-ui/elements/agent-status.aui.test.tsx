import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { TaskState } from "@assistant-ui/react-native";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  state: { thread: { tasks: [] as TaskState[] } },
}));

vi.mock("@assistant-ui/react-native", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react-native")>()),
  useAuiState: (selector: (state: typeof h.state) => unknown) =>
    selector(h.state),
}));

vi.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

vi.mock("react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-native")>();
  const React = await import("react");
  const domProps = ({
    accessibilityLabel,
    accessibilityLiveRegion,
    accessibilityRole,
    accessibilityHint: _accessibilityHint,
    accessible: _accessible,
    children,
    className,
    disabled,
    onPress,
    onStartShouldSetResponder: _onStartShouldSetResponder,
    hitSlop: _hitSlop,
    nestedScrollEnabled: _nestedScrollEnabled,
    style,
    ...props
  }: any) => ({
    ...props,
    "aria-disabled": disabled ? "true" : undefined,
    "aria-label": accessibilityLabel,
    "aria-live": accessibilityLiveRegion,
    className,
    disabled,
    onClick: (event: MouseEvent) => {
      event.stopPropagation();
      onPress?.(event);
    },
    role: accessibilityRole,
    style:
      style?.paddingStart === undefined
        ? style
        : { ...style, paddingInlineStart: style.paddingStart },
  });
  const View = (props: any) =>
    React.createElement("div", domProps(props), props.children);
  const Pressable = (props: any) =>
    React.createElement("button", domProps(props), props.children);
  const Text = (props: any) =>
    React.createElement("span", domProps(props), props.children);
  const ScrollView = (props: any) =>
    React.createElement("div", domProps(props), props.children);
  const Modal = ({ children, onRequestClose, visible }: any) =>
    visible
      ? React.createElement(
          "div",
          {
            ref: (element: HTMLDivElement | null) => {
              if (element) (element as any).onRequestClose = onRequestClose;
            },
            role: "dialog",
          },
          children,
        )
      : null;

  return {
    ...actual,
    Animated: { ...actual.Animated, View },
    Modal,
    Pressable,
    ScrollView,
    Text,
    View,
  };
});

vi.mock("uniwind", async (importOriginal) => ({
  ...(await importOriginal<typeof import("uniwind")>()),
  withUniwind: (Component: unknown) => Component,
}));

vi.mock("lucide-react-native", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react-native")>();
  const React = await import("react");
  const icon = (name: string) => () =>
    React.createElement("span", { "data-testid": name });

  return {
    ...actual,
    BanIcon: icon("BanIcon"),
    CheckIcon: icon("CheckIcon"),
    ChevronDownIcon: icon("ChevronDownIcon"),
    ChevronRightIcon: icon("ChevronRightIcon"),
    ChevronUpIcon: icon("ChevronUpIcon"),
    PauseIcon: icon("PauseIcon"),
    RotateCcwIcon: icon("RotateCcwIcon"),
    XIcon: icon("XIcon"),
  };
});

import {
  AgentStatus,
  summaryLabel,
  summaryState,
  TaskTray,
} from "./agent-status.aui";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const running = { type: "running" } as const;
const done = { type: "complete", reason: "stop" } as const;
const waiting = { type: "requires-action", reason: "tool-calls" } as const;
const failed = { type: "incomplete", reason: "error", error: "boom" } as const;

const taskOf = (
  id: string,
  description: string,
  status: TaskState["status"],
  extra: Partial<TaskState> = {},
): TaskState => ({
  id,
  toolName: "task",
  args: { description, subagent_type: "researcher" },
  status,
  messageId: "m1",
  parentTaskId: null,
  depth: 0,
  messages: [],
  ...extra,
});

const setTasks = (tasks: TaskState[]) => {
  h.state.thread.tasks = tasks;
};

const click = (element: Element) => {
  element.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
};

describe("AgentStatus", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    setTasks([]);
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

  const render = async () => {
    await act(async () => {
      root.render(<AgentStatus />);
    });
  };

  it("renders nothing without running or waiting tasks", async () => {
    setTasks([
      taskOf("done", "Done", done),
      taskOf("failed", "Failed", failed),
    ]);
    await render();

    expect(container.childElementCount).toBe(0);
  });

  it("names a single running task", async () => {
    setTasks([
      taskOf("running", "Explore the runtime", running),
      taskOf("done", "Done", done),
    ]);
    await render();

    expect(container.textContent).toContain("Explore the runtime");
  });

  it("counts several running tasks", async () => {
    setTasks([
      taskOf("one", "One", running),
      taskOf("two", "Two", running),
      taskOf("three", "Three", done),
    ]);
    await render();

    expect(container.textContent).toContain("2 of 3 tasks running");
  });

  it("reports waiting tasks once none are running", async () => {
    setTasks([taskOf("one", "One", waiting), taskOf("two", "Two", done)]);
    await render();

    expect(container.textContent).toContain("1 task waiting for input");
  });

  it("uses the earliest running start time for elapsed time", async () => {
    vi.useFakeTimers();
    try {
      const now = new Date("2026-09-16T00:01:05Z").getTime();
      vi.setSystemTime(now);
      setTasks([
        taskOf("early", "Early", running, {
          timing: { startedAt: now - 65_000 },
        }),
        taskOf("late", "Late", running, {
          timing: { startedAt: now - 5_000 },
        }),
      ]);
      await render();

      expect(container.textContent).toContain("1m 5s");
      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
      expect(container.textContent).toContain("1m 6s");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("summaryState and summaryLabel", () => {
  it("reports settled failures in the summary label", () => {
    expect(
      summaryLabel({
        total: 3,
        running: 0,
        waiting: 0,
        failed: 1,
        startedAt: undefined,
        runningLabel: undefined,
      }),
    ).toBe("3 tasks done, 1 failed");
  });

  it.each([
    [{ running: 1, waiting: 1, failed: 1 }, "working"],
    [{ running: 0, waiting: 1, failed: 1 }, "waiting"],
    [{ running: 0, waiting: 0, failed: 1 }, "failed"],
    [{ running: 0, waiting: 0, failed: 0 }, "done"],
  ] as const)("gives %o the %s state", (counts, state) => {
    expect(
      summaryState({
        total: 3,
        ...counts,
        startedAt: undefined,
        runningLabel: undefined,
      }),
    ).toBe(state);
  });
});

describe("TaskTray", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    setTasks([]);
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

  const render = async () => {
    await act(async () => {
      root.render(<TaskTray />);
    });
  };

  const trigger = () =>
    container.querySelector('[aria-label$=", working"]') as HTMLButtonElement;

  const rows = () => [
    ...container.querySelectorAll<HTMLElement>(".aui-task-tray-item"),
  ];

  it("renders nothing with no tasks", async () => {
    await render();

    expect(container.childElementCount).toBe(0);
  });

  it("opens rows in order with their task state and depth indentation", async () => {
    setTasks([
      taskOf("parent", "Explore the runtime", running),
      taskOf("nested", "Check the docs", done, {
        parentTaskId: "parent",
        depth: 1,
      }),
      taskOf("failed", "Run the suite", failed),
    ]);
    await render();

    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    await act(async () => {
      click(trigger());
    });

    expect(container.querySelector('[role="dialog"]')).not.toBeNull();
    expect(rows().map((row) => row.getAttribute("aria-label"))).toEqual([
      "Explore the runtime, working",
      "Check the docs, done",
      "Run the suite, failed",
    ]);
    expect(rows()[1]?.style.paddingInlineStart).toBe("22px");
  });

  it("pages rows, resets after closing, and closes if tasks empty", async () => {
    setTasks(
      Array.from({ length: 6 }, (_, index) =>
        taskOf(`t${index}`, `Task ${index}`, index === 0 ? running : done),
      ),
    );
    await render();
    await act(async () => {
      click(trigger());
    });

    expect(rows()).toHaveLength(4);
    const more = () =>
      [...container.querySelectorAll<HTMLElement>('[role="button"]')].find(
        (element) => element.textContent === "Show 2 more",
      ) as HTMLElement;
    await act(async () => {
      click(more());
    });
    expect(rows()).toHaveLength(6);

    await act(async () => {
      click(container.querySelector('[aria-label="Close tasks"]') as Element);
    });
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    await act(async () => {
      click(trigger());
    });
    expect(rows()).toHaveLength(4);

    setTasks([]);
    await render();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
