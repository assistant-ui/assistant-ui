import { describe, it, expect } from "vitest";
import { diffMessages } from "../replay/diff";
import type { ThreadMessage } from "../types/message";

const msg = (id: string, text: string): ThreadMessage =>
  ({
    id,
    role: "assistant",
    createdAt: new Date(),
    content: [{ type: "text", text }],
    status: { type: "complete", reason: "stop" },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as ThreadMessage;

describe("diffMessages", () => {
  it("detects added messages", () => {
    const prev: ThreadMessage[] = [];
    const next = [msg("1", "hello")];
    const diffs = diffMessages(prev, next);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.type).toBe("added");
    expect(diffs[0]!.messageId).toBe("1");
  });

  it("detects updated messages via reference inequality", () => {
    const original = msg("1", "hello");
    const updated = msg("1", "hello updated");
    const diffs = diffMessages([original], [updated]);
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.type).toBe("updated");
  });

  it("returns empty when messages are same reference", () => {
    const m = msg("1", "hello");
    const diffs = diffMessages([m], [m]);
    expect(diffs).toHaveLength(0);
  });

  it("handles multiple changes", () => {
    const m1 = msg("1", "first");
    const m2 = msg("2", "second");
    const m2Updated = msg("2", "second updated");
    const m3 = msg("3", "new");
    const diffs = diffMessages([m1, m2], [m1, m2Updated, m3]);
    expect(diffs).toHaveLength(2);
    expect(diffs[0]!.type).toBe("updated");
    expect(diffs[1]!.type).toBe("added");
  });

  it("returns a reset when the active branch changes", () => {
    const branchA = msg("2a", "branch a");
    const branchB = msg("2b", "branch b");
    const diffs = diffMessages(
      [msg("1", "root"), branchA],
      [msg("1", "root"), branchB],
    );
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.type).toBe("reset");
  });

  it("returns a reset when messages are truncated", () => {
    const diffs = diffMessages(
      [msg("1", "root"), msg("2", "child")],
      [msg("1", "root")],
    );
    expect(diffs).toHaveLength(1);
    expect(diffs[0]!.type).toBe("reset");
  });
});
