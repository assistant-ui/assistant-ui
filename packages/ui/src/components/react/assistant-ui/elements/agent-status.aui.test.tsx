import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import type { TaskState } from "@assistant-ui/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentStatus, TaskTray } from "./agent-status.aui";

const mocks = vi.hoisted(() => ({
  state: { thread: { tasks: [] as TaskState[] } },
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAuiState: (selector: (s: typeof mocks.state) => unknown) =>
    selector(mocks.state),
}));

const running = { type: "running" } as const;
const done = { type: "complete", reason: "stop" } as const;
const waiting = { type: "requires-action", reason: "tool-calls" } as const;
const failed = { type: "incomplete", reason: "error", error: "boom" } as const;
const cancelled = { type: "incomplete", reason: "cancelled" } as const;

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
  mocks.state.thread.tasks = tasks;
};

afterEach(() => {
  cleanup();
  setTasks([]);
});

describe("AgentStatus", () => {
  it("renders nothing without tasks", () => {
    const { container } = render(<AgentStatus />);

    expect(container.childElementCount).toBe(0);
  });

  it("names the only running task", () => {
    setTasks([
      taskOf("t1", "Explore the runtime", running),
      taskOf("t2", "Summarize findings", done),
    ]);

    render(<AgentStatus />);

    expect(screen.getByText("Explore the runtime")).toBeTruthy();
    expect(screen.getByText("working").classList.contains("sr-only")).toBe(
      true,
    );
  });

  it("counts several running tasks", () => {
    setTasks([
      taskOf("t1", "Explore the runtime", running),
      taskOf("t2", "Summarize findings", running),
      taskOf("t3", "Run the suite", done),
    ]);

    render(<AgentStatus />);

    expect(screen.getByText("2 of 3 tasks running")).toBeTruthy();
  });

  it("reports tasks waiting for input once nothing runs", () => {
    setTasks([
      taskOf("t1", "Explore the runtime", waiting),
      taskOf("t2", "Summarize findings", done),
    ]);

    render(<AgentStatus />);

    expect(screen.getByText("1 task waiting for input")).toBeTruthy();
    expect(screen.getByText("waiting")).toBeTruthy();
  });

  it("renders nothing once every task has settled", () => {
    setTasks([
      taskOf("t1", "Explore the runtime", done),
      taskOf("t2", "Summarize findings", failed),
    ]);

    const { container } = render(<AgentStatus />);

    expect(container.childElementCount).toBe(0);
  });

  it("reports finished work with its failures on the tray pill", () => {
    setTasks([
      taskOf("t1", "Explore the runtime", done),
      taskOf("t2", "Summarize findings", failed),
      taskOf("t3", "Run the suite", done),
    ]);

    render(<TaskTray />);

    expect(
      screen.getByRole("button", { name: /3 tasks done, 1 failed/ }),
    ).toBeTruthy();
    expect(screen.getByText("failed").classList.contains("sr-only")).toBe(true);
  });

  it("counts a cancelled task as finished rather than failed", () => {
    setTasks([
      taskOf("t1", "Explore the runtime", cancelled),
      taskOf("t2", "Summarize findings", done),
    ]);

    render(<TaskTray />);

    expect(screen.getByRole("button", { name: /2 tasks done/ })).toBeTruthy();
    expect(screen.getByText("done").classList.contains("sr-only")).toBe(true);
  });

  it("shows the elapsed time since the earliest running task started", () => {
    vi.useFakeTimers();
    try {
      const now = new Date("2026-09-16T00:01:05Z").getTime();
      vi.setSystemTime(now);
      setTasks([
        taskOf("t1", "Explore the runtime", running, {
          timing: { startedAt: now - 65_000 },
        }),
        taskOf("t2", "Summarize findings", running, {
          timing: { startedAt: now - 5_000 },
        }),
      ]);

      render(<AgentStatus />);

      expect(screen.getByText("1m 5s")).toBeTruthy();

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      expect(screen.getByText("1m 6s")).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("TaskTray", () => {
  it("lists every task with its state and nesting", async () => {
    setTasks([
      taskOf("t1", "Explore the runtime", running),
      taskOf("t1-nested", "Check the docs", done, {
        parentTaskId: "t1",
        depth: 1,
      }),
      taskOf("t2", "Run the suite", failed),
    ]);

    render(<TaskTray />);

    const trigger = screen.getByRole("button", { name: /Explore the runtime/ });
    await act(async () => {
      fireEvent.click(trigger);
    });

    const list = await screen.findByRole("list", { name: "Tasks" });
    const items = [
      ...list.querySelectorAll<HTMLElement>('[data-slot="aui_task-tray-item"]'),
    ];
    expect(items.map((item) => item.getAttribute("data-state"))).toEqual([
      "working",
      "done",
      "failed",
    ]);
    expect(items[1]!.style.paddingInlineStart).toBe("1.375rem");
    expect(items.map((item) => item.textContent)).toEqual([
      "workingExplore the runtimeresearcher",
      "doneCheck the docsresearcher",
      "failedRun the suiteresearcher",
    ]);
    expect(items[2]!.querySelector("svg")).toBeTruthy();
  });

  it("pages the tray four tasks at a time", async () => {
    setTasks(
      Array.from({ length: 6 }, (_, index) =>
        taskOf(`t${index}`, `Task ${index}`, index === 0 ? running : done),
      ),
    );

    render(<TaskTray />);
    await act(async () => {
      fireEvent.click(screen.getByText("Task 0"));
    });

    const list = await screen.findByRole("list", { name: "Tasks" });
    const rows = () =>
      list.querySelectorAll('[data-slot="aui_task-tray-item"]').length;
    expect(rows()).toBe(4);

    fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));

    expect(rows()).toBe(6);
    expect(screen.queryByRole("button", { name: /Show \d+ more/ })).toBeNull();
  });

  it("resets the page when the task set changes", async () => {
    const tasksFor = (prefix: string) =>
      Array.from({ length: 6 }, (_, index) =>
        taskOf(`${prefix}${index}`, `${prefix} task ${index}`, running, {
          messageId: `${prefix}-message`,
        }),
      );
    setTasks(tasksFor("a"));

    const { rerender } = render(<TaskTray />);
    await act(async () => {
      fireEvent.click(screen.getByText("6 of 6 tasks running"));
    });
    const list = await screen.findByRole("list", { name: "Tasks" });
    const rows = () =>
      list.querySelectorAll('[data-slot="aui_task-tray-item"]').length;
    fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));
    expect(rows()).toBe(6);

    setTasks(tasksFor("b"));
    rerender(<TaskTray />);

    expect(rows()).toBe(4);
    expect(screen.getByText("b task 0")).toBeTruthy();
  });

  it("closes the tray when the thread runs out of tasks", async () => {
    setTasks([taskOf("t1", "Explore the runtime", running)]);
    const { rerender } = render(<TaskTray />);
    await act(async () => {
      fireEvent.click(screen.getByText("Explore the runtime"));
    });
    expect(await screen.findByRole("list", { name: "Tasks" })).toBeTruthy();

    setTasks([]);
    rerender(<TaskTray />);
    expect(screen.queryByRole("list", { name: "Tasks" })).toBeNull();

    setTasks([taskOf("t2", "Summarize findings", done)]);
    rerender(<TaskTray />);
    expect(screen.getByText("1 task done")).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Tasks" })).toBeNull();
  });
});
