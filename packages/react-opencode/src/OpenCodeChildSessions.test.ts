import { describe, expect, it, vi } from "vitest";
import { createOpenCodeThreadState } from "./openCodeThreadState";
import { OpenCodeChildSessions } from "./OpenCodeChildSessions";
import type { Part } from "./types";

const taskPart = (id: string, sessionId: string): Part =>
  ({
    id,
    sessionID: "parent",
    messageID: "message",
    callID: id,
    type: "tool",
    tool: "task",
    state: {
      status: "completed",
      input: {},
      output: "Done",
      title: "Task",
      metadata: { sessionId },
      time: { start: 1, end: 2 },
    },
  }) as Part;

const createFixture = () => {
  let state = createOpenCodeThreadState("parent");
  const children = new Map<
    string,
    {
      unsubscribe: ReturnType<typeof vi.fn>;
      discard: ReturnType<typeof vi.fn>;
    }
  >();
  const createController = vi.fn((sessionId: string) => {
    const unsubscribe = vi.fn();
    const discard = vi.fn();
    const childState = createOpenCodeThreadState(sessionId);
    children.set(sessionId, { unsubscribe, discard });
    return {
      controller: {
        getState: () => childState,
        subscribe: vi.fn(() => unsubscribe),
        load: vi.fn().mockResolvedValue(undefined),
      },
      discard,
    };
  });
  const sessions = new OpenCodeChildSessions(
    {
      getState: () => state,
      setState: (nextState) => {
        state = nextState;
      },
      notifyListeners: vi.fn(),
      hasListeners: () => true,
      createController,
    },
    "parent",
  );
  return { sessions, createController, children, getState: () => state };
};

describe("OpenCodeChildSessions", () => {
  it("indexes a part's child session", () => {
    const fixture = createFixture();

    fixture.sessions.syncIndex({
      type: "part.updated",
      messageId: "message",
      part: taskPart("part", "child"),
    });

    expect(fixture.createController).toHaveBeenCalledTimes(1);
    expect(fixture.getState().childSessionsById.child?.sessionId).toBe("child");
  });

  it("moves a part to another child session", () => {
    const fixture = createFixture();
    fixture.sessions.syncIndex({
      type: "part.updated",
      messageId: "message",
      part: taskPart("part", "first"),
    });

    fixture.sessions.syncIndex({
      type: "part.updated",
      messageId: "message",
      part: taskPart("part", "second"),
    });

    expect(fixture.children.get("first")?.unsubscribe).toHaveBeenCalledOnce();
    expect(fixture.children.get("first")?.discard).toHaveBeenCalledOnce();
    expect(Object.keys(fixture.getState().childSessionsById)).toEqual([
      "second",
    ]);
    expect(fixture.createController).toHaveBeenCalledTimes(2);
  });

  it("removes a part from the child session index", () => {
    const fixture = createFixture();
    fixture.sessions.syncIndex({
      type: "part.updated",
      messageId: "message",
      part: taskPart("part", "child"),
    });

    fixture.sessions.syncIndex({
      type: "part.removed",
      messageId: "message",
      partId: "part",
    });

    expect(fixture.children.get("child")?.discard).toHaveBeenCalledOnce();
    expect(Object.keys(fixture.getState().childSessionsById)).toEqual([]);
  });

  it("detaches every child controller", () => {
    const fixture = createFixture();
    for (const [partId, sessionId] of [
      ["one", "first"],
      ["two", "second"],
    ]) {
      fixture.sessions.syncIndex({
        type: "part.updated",
        messageId: "message",
        part: taskPart(partId!, sessionId!),
      });
    }

    fixture.sessions.detachAll();

    expect(fixture.children.get("first")?.unsubscribe).toHaveBeenCalledOnce();
    expect(fixture.children.get("second")?.unsubscribe).toHaveBeenCalledOnce();
    expect(fixture.children.get("first")?.discard).not.toHaveBeenCalled();
    expect(fixture.children.get("second")?.discard).not.toHaveBeenCalled();
  });
});
