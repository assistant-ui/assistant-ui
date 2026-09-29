import { describe, expect, it } from "vitest";
import type { ThreadMessage, ToolCallMessagePart } from "../../types/message";
import { createTaskDeriver, getTaskKey } from "./thread-tasks";

const assistantMessage = (
  id: string,
  status:
    | { type: "running" }
    | { type: "complete"; reason: "stop" }
    | { type: "incomplete"; reason: "error"; error: unknown },
  content:
    | readonly ToolCallMessagePart[]
    | readonly { type: "text"; text: string }[],
) =>
  ({
    id,
    role: "assistant",
    createdAt: new Date(0),
    content,
    status,
    metadata: {
      unstable_state: {},
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as unknown as ThreadMessage;

const toolCall = (
  id: string,
  messages?: readonly ThreadMessage[],
  result?: unknown,
) =>
  ({
    type: "tool-call",
    toolCallId: id,
    toolName: "delegate",
    args: { id },
    argsText: JSON.stringify({ id }),
    ...(messages !== undefined ? { messages } : undefined),
    ...(result !== undefined ? { result } : undefined),
  }) as ToolCallMessagePart;

describe("createTaskDeriver", () => {
  it("derives top-level and nested tasks in document order", () => {
    const nestedTask = toolCall("nested-1", []);
    const nestedMessage = assistantMessage(
      "nested-message",
      { type: "running" },
      [nestedTask],
    );
    const topLevelTask = toolCall("top-level-1", [nestedMessage]);
    const tasks = createTaskDeriver()([
      assistantMessage("outer-message", { type: "running" }, [topLevelTask]),
    ]);

    expect(tasks.map((task) => task.id)).toEqual(["top-level-1", "nested-1"]);
    expect(tasks[0]).toMatchObject({
      depth: 0,
      parentTaskId: null,
      messageId: "outer-message",
    });
    expect(tasks[1]).toMatchObject({
      depth: 1,
      parentTaskId: "top-level-1",
      messageId: "nested-message",
    });
  });

  it("uses normalized tool call statuses", () => {
    const tasks = createTaskDeriver()([
      assistantMessage("outer-message", { type: "running" }, [
        toolCall("pending", []),
        toolCall("complete", [], "done"),
      ]),
    ]);

    expect(tasks.map((task) => task.status)).toEqual([
      { type: "running" },
      { type: "complete" },
    ]);
  });

  it("excludes tool calls without nested messages", () => {
    const tasks = createTaskDeriver()([
      assistantMessage("outer-message", { type: "running" }, [
        toolCall("not-a-task"),
        toolCall("task", []),
      ]),
    ]);

    expect(tasks.map((task) => task.id)).toEqual(["task"]);
  });

  it("preserves the array identity when an unrelated sibling changes", () => {
    const task = toolCall("delegate-1", []);
    const derive = createTaskDeriver();
    const initial = derive([
      assistantMessage("outer-message", { type: "running" }, [
        { type: "text", text: "one" },
        task,
      ] as unknown as readonly ToolCallMessagePart[]),
    ]);
    const updated = derive([
      assistantMessage("outer-message", { type: "running" }, [
        { type: "text", text: "two" },
        task,
      ] as unknown as readonly ToolCallMessagePart[]),
    ]);

    expect(updated).toBe(initial);
  });

  it("creates a fresh entry and array when a nested status changes", () => {
    const nestedTask = toolCall("nested-1", []);
    const derive = createTaskDeriver();
    const initial = derive([
      assistantMessage("outer-message", { type: "running" }, [
        toolCall("top-level-1", [
          assistantMessage("nested-message", { type: "running" }, [nestedTask]),
        ]),
      ]),
    ]);
    const updated = derive([
      assistantMessage("outer-message", { type: "running" }, [
        toolCall("top-level-1", [
          assistantMessage(
            "nested-message",
            { type: "complete", reason: "stop" },
            [nestedTask],
          ),
        ]),
      ]),
    ]);

    expect(updated).not.toBe(initial);
    expect(updated[1]).not.toBe(initial[1]);
    expect(updated[1]?.status).toMatchObject({ type: "complete" });
  });

  it("creates a fresh entry when an incomplete status changes its error", () => {
    const task = toolCall("failing", []);
    const derive = createTaskDeriver();
    const initial = derive([
      assistantMessage(
        "outer-message",
        { type: "incomplete", reason: "error", error: "first" },
        [task],
      ),
    ]);
    const updated = derive([
      assistantMessage(
        "outer-message",
        { type: "incomplete", reason: "error", error: "second" },
        [task],
      ),
    ]);

    expect(updated).not.toBe(initial);
    expect(updated[0]).not.toBe(initial[0]);
    expect(updated[0]?.status).toMatchObject({
      type: "incomplete",
      reason: "error",
      error: "second",
    });
  });

  it("rebuilds an entry when an unchanged part moves to another message", () => {
    const part = toolCall("moving", []);
    const derive = createTaskDeriver();
    const initial = derive([
      assistantMessage("first-message", { type: "running" }, [part]),
    ]);
    const moved = derive([
      assistantMessage("second-message", { type: "running" }, [part]),
    ]);

    expect(moved[0]).not.toBe(initial[0]);
    expect(moved[0]?.messageId).toBe("second-message");
  });

  it("stops descending past the depth cap", () => {
    let content: readonly ToolCallMessagePart[] = [toolCall("leaf", [])];
    for (let level = 40; level > 0; level -= 1) {
      content = [
        toolCall(`level-${level}`, [
          assistantMessage(`message-${level}`, { type: "running" }, content),
        ]),
      ];
    }
    const tasks = createTaskDeriver()([
      assistantMessage("root", { type: "running" }, content),
    ]);

    expect(Math.max(...tasks.map((task) => task.depth))).toBe(32);
  });

  it("keeps the array identity when nested conversations repeat a toolCallId", () => {
    const nested = (messageId: string) =>
      assistantMessage(messageId, { type: "complete", reason: "stop" }, [
        toolCall("call_1", [], "ok"),
      ]);
    const messages = [
      assistantMessage("outer-message", { type: "complete", reason: "stop" }, [
        toolCall("delegate-a", [nested("nested-a")], "ok"),
        toolCall("delegate-b", [nested("nested-b")], "ok"),
      ]),
    ];
    const derive = createTaskDeriver();
    const first = derive(messages);
    const second = derive(messages);

    expect(first.map((task) => task.id)).toEqual([
      "delegate-a",
      "call_1",
      "delegate-b",
      "call_1",
    ]);
    expect(second).toBe(first);
  });

  it("keys tasks by document order when nested payloads repeat every id", () => {
    const replay = () =>
      assistantMessage("nested", { type: "complete", reason: "stop" }, [
        toolCall("call_1", [], "ok"),
      ]);
    const messages = [
      assistantMessage("outer-message", { type: "complete", reason: "stop" }, [
        toolCall("delegate-a", [replay()], "ok"),
        toolCall("delegate-b", [replay()], "ok"),
      ]),
    ];
    const derive = createTaskDeriver();
    const first = derive(messages);

    expect(new Set(first.map(getTaskKey)).size).toBe(4);
    expect(derive(messages)).toBe(first);
  });

  it("reads a nested message without a status as complete", () => {
    const unnormalized = {
      ...assistantMessage("nested", { type: "running" }, [
        toolCall("call_1", []),
      ]),
      status: undefined,
    } as unknown as ThreadMessage;
    const [, nestedTask] = createTaskDeriver()([
      assistantMessage("outer-message", { type: "running" }, [
        toolCall("delegate", [unnormalized], "ok"),
      ]),
    ]);

    expect(nestedTask?.status).toEqual({ type: "complete" });
  });

  it("preserves unchanged entries when a task is appended", () => {
    const first = toolCall("first", []);
    const derive = createTaskDeriver();
    const initial = derive([
      assistantMessage("outer-message", { type: "running" }, [first]),
    ]);
    const updated = derive([
      assistantMessage("outer-message", { type: "running" }, [
        first,
        toolCall("second", []),
      ]),
    ]);

    expect(updated).not.toBe(initial);
    expect(updated[0]).toBe(initial[0]);
    expect(updated.map((task) => task.id)).toEqual(["first", "second"]);
  });
});
