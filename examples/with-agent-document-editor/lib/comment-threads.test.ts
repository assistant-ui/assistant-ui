import { describe, expect, it } from "vitest";
import { threadIds } from "./comment-threads";

describe("threadIds", () => {
  it("puts a reply to a reply under the thread at the top", () => {
    const threads = threadIds([
      { id: "a", replyTo: null },
      { id: "b", replyTo: "a" },
      { id: "c", replyTo: "b" },
      { id: "d", replyTo: null },
    ]);

    expect(Object.fromEntries(threads)).toEqual({
      a: "a",
      b: "a",
      c: "a",
      d: "d",
    });
  });

  it("makes a reply whose parent is gone a thread of its own", () => {
    const threads = threadIds([
      { id: "a", replyTo: "missing" },
      { id: "b", replyTo: "a" },
    ]);

    expect(Object.fromEntries(threads)).toEqual({ a: "a", b: "a" });
  });

  it("ends on replies that answer each other", () => {
    const threads = threadIds([
      { id: "a", replyTo: "b" },
      { id: "b", replyTo: "a" },
    ]);

    expect([...threads.keys()]).toEqual(["a", "b"]);
  });
});
