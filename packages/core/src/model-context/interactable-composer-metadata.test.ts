import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findLatestSnapshotEntry,
  findModelKnownState,
  formatInteractableSnapshot,
  gateInteractableComposerMetadata,
  getInteractableSnapshots,
  interactableToolName,
  type InteractableSnapshotEntry,
} from "./interactable-composer-metadata";

const userMsg = (interactables: InteractableSnapshotEntry[]) => ({
  role: "user" as const,
  metadata: { custom: { interactables } },
});

const assistantMsg = (interactables: InteractableSnapshotEntry[]) => ({
  role: "assistant" as const,
  metadata: { custom: { interactables } },
});

const assistantToolCall = (
  toolName: string,
  args: Record<string, unknown>,
  result?: unknown,
) => ({
  role: "assistant" as const,
  content: [
    {
      type: "tool-call" as const,
      toolName,
      args,
      ...(result !== undefined ? { result } : {}),
    },
  ],
});

const entry = (
  id: string,
  state: unknown,
  name = id,
): InteractableSnapshotEntry => ({ id, name, state });

describe("getInteractableSnapshots", () => {
  it("reads entries from metadata.custom.interactables", () => {
    const msg = userMsg([entry("a", { v: 1 })]);
    expect(getInteractableSnapshots(msg)).toEqual([entry("a", { v: 1 })]);
  });

  it("returns undefined for missing or malformed metadata", () => {
    expect(getInteractableSnapshots({})).toBeUndefined();
    expect(getInteractableSnapshots({ metadata: null })).toBeUndefined();
    expect(
      getInteractableSnapshots({
        metadata: { custom: { interactables: "x" } },
      }),
    ).toBeUndefined();
  });
});

describe("formatInteractableSnapshot", () => {
  it("includes the name, id, and JSON state", () => {
    expect(formatInteractableSnapshot(entry("n1", { v: 1 }, "note"))).toBe(
      '[Current state of "note" (id: "n1"): {"v":1}]',
    );
  });
});

describe("interactableToolName", () => {
  it("sanitizes the name", () => {
    expect(interactableToolName("note")).toBe("update_note");
    expect(interactableToolName("my notes!")).toBe("update_my_notes_");
  });
});

describe("findLatestSnapshotEntry", () => {
  it("returns undefined for empty history", () => {
    expect(findLatestSnapshotEntry([], "a")).toBeUndefined();
  });

  it("returns the latest snapshot when an id appears in multiple messages", () => {
    const history = [
      userMsg([entry("a", { v: 1 })]),
      userMsg([entry("a", { v: 2 })]),
    ];
    expect(findLatestSnapshotEntry(history, "a")?.state).toEqual({ v: 2 });
  });

  it("skips non-user messages even when they carry interactable metadata", () => {
    const history = [
      userMsg([entry("a", { v: 1 })]),
      assistantMsg([entry("a", { v: 999 })]),
    ];
    expect(findLatestSnapshotEntry(history, "a")?.state).toEqual({ v: 1 });
  });

  it("finds the right entry by id among several in one message", () => {
    const history = [userMsg([entry("a", { v: 1 }), entry("b", { v: 2 })])];
    expect(findLatestSnapshotEntry(history, "b")?.state).toEqual({ v: 2 });
  });

  it("skips messages without interactable metadata", () => {
    const history = [
      { role: "user" as const },
      { role: "user" as const, metadata: { custom: {} } },
      userMsg([entry("a", { v: 1 })]),
    ];
    expect(findLatestSnapshotEntry(history, "a")?.state).toEqual({ v: 1 });
    expect(findLatestSnapshotEntry(history, "missing")).toBeUndefined();
  });

  it("skips a message whose interactables metadata is not an array without throwing", () => {
    const history = [
      {
        role: "user" as const,
        metadata: { custom: { interactables: "oops" } },
      },
      userMsg([entry("a", { v: 1 })]),
    ];
    expect(() => findLatestSnapshotEntry(history, "a")).not.toThrow();
    expect(findLatestSnapshotEntry(history, "a")?.state).toEqual({ v: 1 });
  });
});

describe("findModelKnownState", () => {
  it("returns undefined when no snapshot exists", () => {
    const history = [assistantToolCall("update_note", { id: "a", v: 9 })];
    expect(findModelKnownState(history, "a", "note")).toBeUndefined();
  });

  it("returns the latest snapshot when no later tool calls exist", () => {
    const history = [userMsg([entry("a", { v: 1 }, "note")])];
    expect(findModelKnownState(history, "a", "note")?.state).toEqual({ v: 1 });
  });

  it("folds the assistant's own update_* calls on top of the snapshot", () => {
    const history = [
      userMsg([entry("a", { v: 1, title: "x" }, "note")]),
      assistantToolCall("update_note", { id: "a", v: 2 }, { success: true }),
    ];
    expect(findModelKnownState(history, "a", "note")?.state).toEqual({
      v: 2,
      title: "x",
    });
  });

  it("only folds calls made after the latest snapshot", () => {
    const history = [
      userMsg([entry("a", { v: 1 }, "note")]),
      assistantToolCall("update_note", { id: "a", v: 2 }),
      userMsg([entry("a", { v: 10 }, "note")]),
    ];
    expect(findModelKnownState(history, "a", "note")?.state).toEqual({
      v: 10,
    });
  });

  it("ignores calls targeting another instance id", () => {
    const history = [
      userMsg([entry("a", { v: 1 }, "note")]),
      assistantToolCall("update_note", { id: "b", v: 2 }),
    ];
    expect(findModelKnownState(history, "a", "note")?.state).toEqual({ v: 1 });
  });

  it("ignores calls of other tools", () => {
    const history = [
      userMsg([entry("a", { v: 1 }, "note")]),
      assistantToolCall("update_board", { id: "a", v: 2 }),
    ];
    expect(findModelKnownState(history, "a", "note")?.state).toEqual({ v: 1 });
  });

  it("ignores rejected calls (success: false results never reached the client)", () => {
    const history = [
      userMsg([entry("a", { v: 1 }, "note")]),
      assistantToolCall("update_note", { id: "a", v: 2 }, { success: false }),
    ];
    expect(findModelKnownState(history, "a", "note")?.state).toEqual({ v: 1 });
  });

  it("folds id-less calls (accepted while a single instance exists)", () => {
    const history = [
      userMsg([entry("a", { v: 1 }, "note")]),
      assistantToolCall("update_note", { v: 2 }),
    ];
    expect(findModelKnownState(history, "a", "note")?.state).toEqual({ v: 2 });
  });
});

describe("gateInteractableComposerMetadata", () => {
  it("returns undefined when meta is undefined", () => {
    expect(gateInteractableComposerMetadata(undefined, [])).toBeUndefined();
  });

  it("stamps a baseline on the first send (no prior snapshot in history)", () => {
    const meta = { interactables: [entry("a", { v: 1 })] };
    const gated = gateInteractableComposerMetadata(meta, []);
    expect(gated?.interactables).toEqual([entry("a", { v: 1 })]);
  });

  it("is idempotent: omits an interactable whose state matches its latest snapshot", () => {
    const meta = { interactables: [entry("a", { v: 1 })] };
    const history = [userMsg([entry("a", { v: 1 })])];
    expect(gateInteractableComposerMetadata(meta, history)).toBeUndefined();
  });

  it("stamps when state differs from the latest snapshot", () => {
    const meta = { interactables: [entry("a", { v: 2 })] };
    const history = [userMsg([entry("a", { v: 1 })])];
    const gated = gateInteractableComposerMetadata(meta, history);
    expect(gated?.interactables).toEqual([entry("a", { v: 2 })]);
  });

  it("omits an interactable the model already knows via its own update_* call", () => {
    const meta = { interactables: [entry("a", { v: 2 }, "note")] };
    const history = [
      userMsg([entry("a", { v: 1 }, "note")]),
      assistantToolCall("update_note", { id: "a", v: 2 }, { success: true }),
    ];
    expect(gateInteractableComposerMetadata(meta, history)).toBeUndefined();
  });

  it("stamps when the user edited after the model's last update_* call", () => {
    const meta = { interactables: [entry("a", { v: 3 }, "note")] };
    const history = [
      userMsg([entry("a", { v: 1 }, "note")]),
      assistantToolCall("update_note", { id: "a", v: 2 }, { success: true }),
    ];
    const gated = gateInteractableComposerMetadata(meta, history);
    expect(gated?.interactables).toEqual([entry("a", { v: 3 }, "note")]);
  });

  it("re-stamps a revert-to-initial-state because the gate compares to history, not the seed", () => {
    // initialState was { v: 0 }; the latest snapshot moved it to { v: 1 };
    // reverting the live state back to { v: 0 } still differs from history,
    // so it must re-stamp (proves the gate never references initialState).
    const meta = { interactables: [entry("a", { v: 0 })] };
    const history = [userMsg([entry("a", { v: 1 })])];
    const gated = gateInteractableComposerMetadata(meta, history);
    expect(gated?.interactables).toEqual([entry("a", { v: 0 })]);
  });

  it("includes only the interactables that changed", () => {
    const meta = {
      interactables: [entry("a", { v: 1 }), entry("b", { v: 99 })],
    };
    const history = [userMsg([entry("a", { v: 1 }), entry("b", { v: 2 })])];
    const gated = gateInteractableComposerMetadata(meta, history);
    expect(gated?.interactables).toEqual([entry("b", { v: 99 })]);
  });

  it("passes through non-interactable metadata keys untouched", () => {
    const meta = { interactables: [entry("a", { v: 1 })], foo: "bar" };
    const history = [userMsg([entry("a", { v: 1 })])];
    const gated = gateInteractableComposerMetadata(meta, history);
    expect(gated).toEqual({ foo: "bar" });
  });

  describe("non-JSON state", () => {
    const ORIGINAL_ENV = process.env.NODE_ENV;
    afterEach(() => {
      process.env.NODE_ENV = ORIGINAL_ENV;
      vi.restoreAllMocks();
    });

    it("warns in dev and re-stamps every send (state is not JSON-equatable)", () => {
      process.env.NODE_ENV = "development";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      // A field set to `undefined` makes the value fail `isJSONValue`, so it is
      // never equal to itself — the gate can't dedupe it against history.
      const nonJson = { note: undefined };
      const meta = { interactables: [entry("a", nonJson)] };

      // First send: no history, stamps.
      const first = gateInteractableComposerMetadata(meta, []);
      expect(first?.interactables).toHaveLength(1);

      // Second send: history already carries the snapshot, yet the value never
      // compares equal, so it re-stamps — documenting per-message growth.
      const history = [
        userMsg(first!.interactables as InteractableSnapshotEntry[]),
      ];
      const second = gateInteractableComposerMetadata(meta, history);
      expect(second?.interactables).toHaveLength(1);

      expect(warn).toHaveBeenCalled();
      expect(warn.mock.calls[0]![0]).toContain("not JSON-equatable");
    });

    it("does not warn in production", () => {
      process.env.NODE_ENV = "production";
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      const meta = { interactables: [entry("a", { note: undefined })] };
      gateInteractableComposerMetadata(meta, []);

      expect(warn).not.toHaveBeenCalled();
    });
  });
});
