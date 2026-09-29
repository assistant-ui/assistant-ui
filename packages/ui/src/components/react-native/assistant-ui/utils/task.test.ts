import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  formatElapsed,
  formatUnknownValue,
  taskLabel,
  taskMeta,
  taskStateOf,
  useTaskElapsed,
  type TaskTiming,
} from "./task";

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe("taskStateOf", () => {
  it.each([
    [{ type: "running" }, undefined, "working"],
    [{ type: "requires-action", reason: "tool-calls" }, undefined, "waiting"],
    [{ type: "incomplete", reason: "cancelled" }, undefined, "cancelled"],
    [
      { type: "incomplete", reason: "error", error: "boom" },
      undefined,
      "failed",
    ],
    [{ type: "complete", reason: "stop" }, true, "failed"],
    [{ type: "complete", reason: "stop" }, undefined, "done"],
  ] as const)("maps %o and isError %s to %s", (status, isError, state) => {
    expect(taskStateOf(status, isError)).toBe(state);
  });
});

describe("taskLabel", () => {
  it.each([
    ["description", "description"],
    ["task", "task"],
    ["title", "title"],
    ["name", "name"],
    ["prompt", "prompt"],
    ["query", "query"],
    ["instructions", "instructions"],
  ])("prefers %s when it is the first populated key", (key, value) => {
    expect(
      taskLabel("task", {
        [key]: value,
        ...(key === "instructions" ? {} : { instructions: "later" }),
      }),
    ).toBe(value);
  });

  it("skips blank values before using the next label key", () => {
    expect(
      taskLabel("task", {
        description: "  ",
        task: "\n",
        title: "  Read the docs  ",
      }),
    ).toBe("Read the docs");
  });

  it("falls back to the tool name for missing and non-object arguments", () => {
    expect(taskLabel("delegate", {})).toBe("delegate");
    expect(taskLabel("delegate", "Read the docs")).toBe("delegate");
  });
});

describe("taskMeta", () => {
  it.each([
    ["subagent_type", "researcher"],
    ["subagentType", "reviewer"],
    ["agent", "planner"],
    ["model", "gpt-5"],
  ])("reads %s", (key, value) => {
    expect(taskMeta({ [key]: value })).toBe(value);
  });
});

describe("formatElapsed", () => {
  it.each([
    [999, "<1s"],
    [3400, "3.4s"],
    [45000, "45s"],
    [125000, "2m 5s"],
  ])("formats %i milliseconds as %s", (ms, expected) => {
    expect(formatElapsed(ms)).toBe(expected);
  });
});

describe("formatUnknownValue", () => {
  it("formats strings, indented objects, errors, and circular values", () => {
    const circular: { self?: unknown } = {};
    circular.self = circular;

    expect(formatUnknownValue("text")).toBe("text");
    expect(formatUnknownValue({ value: "text" }, 2)).toBe(
      '{\n  "value": "text"\n}',
    );
    expect(formatUnknownValue(new Error("boom"))).toBe("Error: boom");
    expect(formatUnknownValue(circular)).toBe("[object Object]");
  });
});

describe("useTaskElapsed", () => {
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

  const Probe = ({
    timing,
    running,
  }: {
    timing?: TaskTiming;
    running: boolean;
  }) => createElement("output", null, String(useTaskElapsed(timing, running)));

  it("returns undefined without timing and the completed duration for settled work", async () => {
    await act(async () => {
      root.render(createElement(Probe, { running: false }));
    });
    expect(container.textContent).toBe("undefined");

    await act(async () => {
      root.render(
        createElement(Probe, {
          running: false,
          timing: { startedAt: 1_000, completedAt: 3_400 },
        }),
      );
    });
    expect(container.textContent).toBe("2400");
  });

  it("ticks running work every second and stops when it no longer runs", async () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(10_000);
      await act(async () => {
        root.render(
          createElement(Probe, { running: true, timing: { startedAt: 5_000 } }),
        );
      });
      expect(container.textContent).toBe("5000");

      await act(async () => {
        vi.advanceTimersByTime(1_000);
      });
      expect(container.textContent).toBe("6000");

      await act(async () => {
        root.render(
          createElement(Probe, {
            running: false,
            timing: { startedAt: 5_000 },
          }),
        );
      });
      expect(container.textContent).toBe("undefined");

      await act(async () => {
        vi.advanceTimersByTime(2_000);
      });
      expect(container.textContent).toBe("undefined");
    } finally {
      vi.useRealTimers();
    }
  });
});
