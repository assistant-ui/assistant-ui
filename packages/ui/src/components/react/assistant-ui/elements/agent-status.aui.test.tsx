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

  it("reports finished work with its failures", () => {
    setTasks([
      taskOf("t1", "Explore the runtime", done),
      taskOf("t2", "Summarize findings", failed),
      taskOf("t3", "Run the suite", done),
    ]);

    render(<AgentStatus />);

    expect(screen.getByText("3 tasks done, 1 failed")).toBeTruthy();
    expect(screen.getByText("done")).toBeTruthy();
  });

  it("shows the elapsed time since the earliest running task started", () => {
    const now = Date.now();
    setTasks([
      taskOf("t1", "Explore the runtime", running, {
        timing: { startedAt: now - 65_000 },
      }),
      taskOf("t2", "Summarize findings", running, {
        timing: { startedAt: now - 5_000 },
      }),
    ]);

    render(<AgentStatus />);

    expect(screen.getByText(/^1m [45]s$/)).toBeTruthy();
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

    await act(async () => {
      fireEvent.click(screen.getByText("Explore the runtime"));
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
  });
});
