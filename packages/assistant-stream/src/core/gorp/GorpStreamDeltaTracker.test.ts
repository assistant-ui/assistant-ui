import { describe, expect, it } from "vitest";
import { GorpStreamDeltaTracker } from "./GorpStreamDeltaTracker";
import { createGorpStream } from "./createGorpStream";
import type { ReadonlyJSONObject } from "../../utils";

describe("GorpStreamDeltaTracker frames", () => {
  it("reports ops of the current frame in getChangedKeys", () => {
    const tracker = new GorpStreamDeltaTracker({ items: {} });
    tracker.append([
      { type: "set", path: ["items", "a"], value: { name: "alpha" } },
    ]);
    expect(tracker.getChangedKeys(["items"])).toEqual(["a"]);
    expect((tracker.state as ReadonlyJSONObject).items).toEqual({
      a: { name: "alpha" },
    });
  });

  it("opens a separate frame per append", () => {
    const tracker = new GorpStreamDeltaTracker({ items: {} });
    tracker.append([
      { type: "set", path: ["items", "a"], value: { name: "alpha" } },
    ]);
    tracker.append([
      { type: "set", path: ["items", "b"], value: { name: "beta" } },
    ]);
    expect(tracker.getChangedKeys(["items"])).toEqual(["b"]);
    expect(tracker.isChangedAt(["items", "a"])).toBe(false);
  });

  it("reports an empty change set before the first append and after an empty append", () => {
    const tracker = new GorpStreamDeltaTracker({ count: 0 });
    expect(tracker.isChangedAt([])).toBe(false);
    expect(tracker.isChangedAt(["count"])).toBe(false);
    expect(tracker.getChangedKeys([])).toEqual([]);
    tracker.append([{ type: "set", path: ["count"], value: 1 }]);
    expect(tracker.isChangedAt([])).toBe(true);
    tracker.append([]);
    expect(tracker.isChangedAt([])).toBe(false);
    expect(tracker.isChangedAt(["count"])).toBe(false);
    expect(tracker.getChangedKeys([])).toEqual([]);
  });
});

describe("GorpStreamDeltaTracker isChangedAt", () => {
  it("returns truthy for any path inside a marked subtree", () => {
    const tracker = new GorpStreamDeltaTracker();
    tracker.append([{ type: "set", path: [], value: { items: {} } }]);
    expect(tracker.isChangedAt([])).toBe(true);
    expect(tracker.isChangedAt(["items"])).toBe(true);
    expect(tracker.isChangedAt(["items", "anything", "deep"])).toBe(true);
  });

  it("returns true for ancestors of a changed path and false for siblings", () => {
    const tracker = new GorpStreamDeltaTracker({ a: { b: "x" }, c: "y" });
    tracker.append([{ type: "set", path: ["a", "b"], value: "z" }]);
    expect(tracker.isChangedAt([])).toBe(true);
    expect(tracker.isChangedAt(["a"])).toBe(true);
    expect(tracker.isChangedAt(["a", "b"])).toBe(true);
    expect(tracker.isChangedAt(["c"])).toBe(false);
  });

  it("marks append-text targets as changed", () => {
    const tracker = new GorpStreamDeltaTracker({ message: "Hello" });
    tracker.append([{ type: "append-text", path: ["message"], value: "!" }]);
    expect(tracker.isChangedAt(["message"])).toBe(true);
    expect(tracker.getChangedKeys([])).toEqual(["message"]);
    expect((tracker.state as ReadonlyJSONObject).message).toBe("Hello!");
  });
});

describe("GorpStreamDeltaTracker getChangedKeys", () => {
  it("diffs keys against the previous frame when a subtree is fully replaced", () => {
    const tracker = new GorpStreamDeltaTracker({ count: 0, items: {} });
    tracker.append([
      { type: "set", path: ["items", "a"], value: { name: "alpha" } },
    ]);
    tracker.append([
      { type: "set", path: ["items", "b"], value: { name: "beta" } },
    ]);
    tracker.append([
      {
        type: "set",
        path: [],
        value: {
          count: 99,
          items: { b: { name: "beta-new" }, c: { name: "gamma" } },
        },
      },
    ]);
    expect(tracker.getChangedKeys(["items"])).toEqual(["b", "c", "a"]);
  });

  it("returns interior node keys for a partially changed subtree", () => {
    const tracker = new GorpStreamDeltaTracker({ items: { a: 1, b: 2 } });
    tracker.append([
      { type: "set", path: ["items", "a"], value: 10 },
      { type: "set", path: ["items", "c"], value: 3 },
    ]);
    expect(tracker.getChangedKeys(["items"])).toEqual(["a", "c"]);
    expect(tracker.getChangedKeys([])).toEqual(["items"]);
    expect(tracker.getChangedKeys(["other"])).toEqual([]);
  });

  it("diffs keys when the previous value at a replaced path was not an object", () => {
    const tracker = new GorpStreamDeltaTracker({ value: "initial" });
    tracker.append([{ type: "set", path: ["value"], value: { nested: true } }]);
    expect(tracker.getChangedKeys(["value"])).toEqual(["nested"]);
  });
});

describe("GorpStreamDeltaTracker inherited object members", () => {
  it("does not treat inherited members as changes on a fresh tracker", () => {
    const tracker = new GorpStreamDeltaTracker({ items: {} });
    expect(tracker.isChangedAt(["toString"])).toBe(false);
    expect(tracker.isChangedAt(["hasOwnProperty"])).toBe(false);
    expect(tracker.getChangedKeys(["toString"])).toEqual([]);
  });

  it("does not treat inherited members as changes on a populated tree", () => {
    const tracker = new GorpStreamDeltaTracker({ items: {} });
    tracker.append([{ type: "set", path: ["items", "a"], value: 1 }]);
    expect(tracker.isChangedAt(["toString"])).toBe(false);
    expect(tracker.isChangedAt(["items", "toString"])).toBe(false);
    expect(tracker.isChangedAt(["items", "valueOf", "deep"])).toBe(false);
    expect(tracker.getChangedKeys([])).toEqual(["items"]);
    expect(tracker.getChangedKeys(["items"])).toEqual(["a"]);
  });
});

describe("GorpStreamDeltaTracker failed append", () => {
  it("leaves state and the change frame untouched when an operation throws", () => {
    const tracker = new GorpStreamDeltaTracker({ count: 5, message: "hi" });
    tracker.append([{ type: "set", path: ["message"], value: "hello" }]);
    const stateBefore = tracker.state;

    expect(() =>
      tracker.append([
        { type: "set", path: ["other"], value: 1 },
        { type: "append-text", path: ["count"], value: "!" },
      ]),
    ).toThrow(/Expected string/);

    expect(tracker.state).toBe(stateBefore);
    expect(tracker.isChangedAt(["message"])).toBe(true);
    expect(tracker.isChangedAt(["other"])).toBe(false);
    expect(tracker.isChangedAt(["count"])).toBe(false);
    expect(tracker.getChangedKeys([])).toEqual(["message"]);
  });
});

describe("GorpStreamDeltaTracker streamed accumulation", () => {
  it("tracks one frame per streamed chunk", async () => {
    const stream = createGorpStream({
      execute: (controller) => {
        controller.enqueue([
          { type: "set", path: ["user"], value: { name: "Initial" } },
        ]);
        controller.enqueue([
          { type: "set", path: ["user", "name"], value: "Updated" },
          { type: "set", path: ["user", "email"], value: "user@example.com" },
        ]);
        controller.enqueue([
          { type: "set", path: ["status"], value: "complete" },
        ]);
      },
    });

    const tracker = new GorpStreamDeltaTracker();
    const frames: string[][] = [];
    for await (const chunk of stream) {
      tracker.append(chunk.operations);
      frames.push(tracker.getChangedKeys(["user"]));
      expect(tracker.state).toEqual(chunk.snapshot);
    }

    expect(frames).toEqual([["name"], ["name", "email"], []]);
    expect(tracker.state).toEqual({
      user: { name: "Updated", email: "user@example.com" },
      status: "complete",
    });
  });
});
