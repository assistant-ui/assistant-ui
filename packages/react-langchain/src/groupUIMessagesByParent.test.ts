import { describe, expect, it } from "vitest";
import { groupUIMessagesByParent } from "./useStreamRuntime";
import type { UIMessage } from "./types";

const uiMessage = (
  metadata: UIMessage["metadata"],
  name = "chart",
): UIMessage => ({
  type: "ui",
  id: "ui-1",
  name,
  props: { points: [1, 2, 3] },
  ...(metadata !== undefined && { metadata }),
});

describe("groupUIMessagesByParent", () => {
  it("returns an empty map for non-array state", () => {
    expect(groupUIMessagesByParent(undefined).size).toBe(0);
    expect(groupUIMessagesByParent(null).size).toBe(0);
    expect(groupUIMessagesByParent({ ui: [] }).size).toBe(0);
  });

  it("groups by metadata.message_id (Python SDK)", () => {
    const ui = uiMessage({ message_id: "msg-2" });
    const map = groupUIMessagesByParent([ui]);

    expect(map.get("msg-2")).toEqual([ui]);
  });

  it("falls back to metadata.id when message_id is absent (JS SDK)", () => {
    const ui = uiMessage({ id: "msg-2" });
    const map = groupUIMessagesByParent([ui]);

    expect(map.get("msg-2")).toEqual([ui]);
  });

  it("prefers message_id over id when both are present", () => {
    const ui = uiMessage({ message_id: "msg-2", id: "msg-9" });
    const map = groupUIMessagesByParent([ui]);

    expect(map.get("msg-2")).toEqual([ui]);
    expect(map.has("msg-9")).toBe(false);
  });

  it("skips entries with no parent link", () => {
    const map = groupUIMessagesByParent([
      uiMessage(undefined),
      uiMessage({ message_id: "" }),
    ]);

    expect(map.size).toBe(0);
  });

  it("collects several UIs under the same parent in order", () => {
    const a = uiMessage({ message_id: "msg-2" }, "chart");
    const b = uiMessage({ message_id: "msg-2" }, "table");
    const map = groupUIMessagesByParent([a, b]);

    expect(map.get("msg-2")).toEqual([a, b]);
  });
});
