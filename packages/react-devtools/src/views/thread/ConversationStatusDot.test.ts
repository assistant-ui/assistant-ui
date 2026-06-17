import { describe, expect, it } from "vitest";
import { resolveConversationDotState } from "./ConversationStatusDot";
import type { ThreadListItemPreview, ThreadPreview } from "./types";

const item = (id: string, over: Partial<ThreadListItemPreview> = {}) =>
  ({ id, ...over }) satisfies ThreadListItemPreview;

const thread = (over: Partial<ThreadPreview> = {}): ThreadPreview => ({
  messages: [],
  suggestions: [],
  capabilities: [],
  ...over,
});

describe("resolveConversationDotState", () => {
  it("returns unloaded when no snapshot or main data exists", () => {
    expect(
      resolveConversationDotState({
        item: item("t1"),
        mainThreadId: "main",
        main: undefined,
        snapshots: {},
      }),
    ).toBe("unloaded");
  });

  it("returns active for the main thread", () => {
    expect(
      resolveConversationDotState({
        item: item("main"),
        mainThreadId: "main",
        main: thread(),
        snapshots: {},
      }),
    ).toBe("active");
  });

  it("returns loaded when a snapshot exists", () => {
    expect(
      resolveConversationDotState({
        item: item("t2"),
        mainThreadId: "main",
        main: thread(),
        snapshots: {
          t2: { messages: [], suggestions: [], capabilities: [] },
        },
      }),
    ).toBe("loaded");
  });

  it("returns error when a loaded thread has incomplete messages", () => {
    expect(
      resolveConversationDotState({
        item: item("t2"),
        mainThreadId: "main",
        main: thread(),
        snapshots: {
          t2: {
            messages: [
              {
                id: "m1",
                role: "assistant",
                parts: [],
                attachments: [],
                status: { type: "incomplete", reason: "error" },
              },
            ],
            suggestions: [],
            capabilities: [],
          },
        },
      }),
    ).toBe("error");
  });

  it("returns new for thread list items marked as new", () => {
    expect(
      resolveConversationDotState({
        item: item("t3", { status: "new" }),
        mainThreadId: "main",
        main: thread(),
        snapshots: {},
      }),
    ).toBe("new");
  });
});
