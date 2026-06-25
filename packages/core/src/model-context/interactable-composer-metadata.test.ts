import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findModelKnownState,
  unstable_formatInteractableSnapshot,
  gateInteractableComposerMetadata,
  unstable_getInteractableSnapshots,
  unstable_getInteractableVersions,
  interactableToolName,
  shallowMergeInteractableState,
  type Unstable_InteractableSnapshotEntry,
} from "./interactable-composer-metadata";

const userMsg = (interactables: Unstable_InteractableSnapshotEntry[]) => ({
  role: "user" as const,
  metadata: { custom: { interactables } },
});

const assistantMsg = (interactables: Unstable_InteractableSnapshotEntry[]) => ({
  role: "assistant" as const,
  metadata: { custom: { interactables } },
});

const toolCallPart = (
  toolName: string,
  args: Record<string, unknown>,
  result?: unknown,
  toolCallId?: string,
) => ({
  type: "tool-call" as const,
  ...(toolCallId !== undefined ? { toolCallId } : {}),
  toolName,
  args,
  ...(result !== undefined ? { result } : {}),
});

const assistantToolCall = (
  toolName: string,
  args: Record<string, unknown>,
  result?: unknown,
  toolCallId?: string,
) => ({
  role: "assistant" as const,
  content: [toolCallPart(toolName, args, result, toolCallId)],
});

/** The assistant message that created instance `id` via a tool call. */
const assistantCreateCall = (id: string, args: Record<string, unknown>) =>
  assistantToolCall("note", args, { success: true }, id);

const entry = (
  id: string,
  state: unknown,
  name = id,
): Unstable_InteractableSnapshotEntry => ({ id, name, state });

const partialEntry = (
  id: string,
  state: unknown,
  name = id,
): Unstable_InteractableSnapshotEntry => ({ id, name, state, partial: true });

describe("unstable_getInteractableSnapshots", () => {
  it("reads entries from metadata.custom.interactables", () => {
    const msg = userMsg([entry("a", { v: 1 })]);
    expect(unstable_getInteractableSnapshots(msg)).toEqual([
      entry("a", { v: 1 }),
    ]);
  });

  it("returns undefined for missing or malformed metadata", () => {
    expect(unstable_getInteractableSnapshots({})).toBeUndefined();
    expect(
      unstable_getInteractableSnapshots({ metadata: null }),
    ).toBeUndefined();
    expect(
      unstable_getInteractableSnapshots({
        metadata: { custom: { interactables: "x" } },
      }),
    ).toBeUndefined();
  });
});

describe("unstable_formatInteractableSnapshot", () => {
  it("includes the name, id, and JSON state", () => {
    expect(
      unstable_formatInteractableSnapshot(entry("n1", { v: 1 }, "note")),
    ).toBe('[Current state of "note" (id: "n1"): {"v":1}]');
  });

  it("formats a partial snapshot as changed fields", () => {
    expect(
      unstable_formatInteractableSnapshot(partialEntry("n1", { v: 1 }, "note")),
    ).toBe(
      '[State of "note" (id: "n1") changed — updated fields: {"v":1}; fields not listed are unchanged]',
    );
  });
});

describe("interactableToolName", () => {
  it("sanitizes the name", () => {
    expect(interactableToolName("note")).toBe("update_note");
    expect(interactableToolName("my notes!")).toBe("update_my_notes_");
  });
});

describe("shallowMergeInteractableState", () => {
  it("applies array operations from a baseline", () => {
    const prev = {
      tasks: [
        { id: "a", title: "A", done: false },
        { id: "b", title: "B", done: false },
      ],
      selectedId: "a",
    };

    expect(
      shallowMergeInteractableState(prev, {
        tasks: {
          update: [{ id: "a", done: true }],
          remove: ["b"],
          add: [{ id: "c", title: "C", done: false }],
        },
        selectedId: "c",
      }),
    ).toEqual({
      tasks: [
        { id: "a", title: "A", done: true },
        { id: "c", title: "C", done: false },
      ],
      selectedId: "c",
    });
  });

  it("keeps raw array replacement semantics", () => {
    expect(
      shallowMergeInteractableState(
        { tasks: [{ id: "a", title: "A" }] },
        { tasks: [{ id: "b", title: "B" }] },
      ),
    ).toEqual({ tasks: [{ id: "b", title: "B" }] });
  });

  it("uses the array baseline only for array operation fields", () => {
    expect(
      shallowMergeInteractableState(
        { tasks: [{ id: "stream", title: "streamed" }], title: "live" },
        { tasks: { add: [{ id: "final", title: "final" }] }, title: "final" },
        { arrayBaseline: { tasks: [{ id: "base", title: "base" }] } },
      ),
    ).toEqual({
      tasks: [
        { id: "base", title: "base" },
        { id: "final", title: "final" },
      ],
      title: "final",
    });
  });
});

describe("findModelKnownState", () => {
  it("returns undefined when no snapshot or creating call exists", () => {
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

  it("lets a later full snapshot replace earlier folded state", () => {
    const history = [
      userMsg([entry("a", { v: 1 }, "note")]),
      assistantToolCall("update_note", { id: "a", v: 2 }),
      userMsg([entry("a", { v: 10 }, "note")]),
    ];
    expect(findModelKnownState(history, "a", "note")?.state).toEqual({
      v: 10,
    });
  });

  it("merges partial snapshots into the known state", () => {
    const history = [
      userMsg([entry("a", { v: 1, title: "x" }, "note")]),
      assistantToolCall("update_note", { id: "a", v: 2 }, { success: true }),
      userMsg([partialEntry("a", { title: "y" }, "note")]),
    ];
    expect(findModelKnownState(history, "a", "note")?.state).toEqual({
      v: 2,
      title: "y",
    });
  });

  it("ignores a partial snapshot without a baseline", () => {
    const history = [userMsg([partialEntry("a", { title: "y" }, "note")])];
    expect(findModelKnownState(history, "a", "note")).toBeUndefined();
  });

  it("seeds the baseline from the creating call's args (id === toolCallId)", () => {
    const history = [assistantCreateCall("a", { v: 1, title: "draft" })];
    expect(findModelKnownState(history, "a", "note")?.state).toEqual({
      v: 1,
      title: "draft",
    });
  });

  it("folds update_* calls on top of the creating call's args", () => {
    const history = [
      assistantCreateCall("a", { v: 1, title: "draft" }),
      assistantToolCall("update_note", { id: "a", v: 2 }, { success: true }),
    ];
    expect(findModelKnownState(history, "a", "note")?.state).toEqual({
      v: 2,
      title: "draft",
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

  it("replays assigned ids from array add update results", () => {
    const history = [
      userMsg([entry("board", { tasks: [] }, "taskBoard")]),
      assistantToolCall(
        "update_taskBoard",
        { id: "board", tasks: { add: [{ title: "Write tests" }] } },
        {
          success: true,
          id: "board",
          addedItemIds: { tasks: ["task-1"] },
        },
      ),
    ];
    expect(findModelKnownState(history, "board", "taskBoard")?.state).toEqual({
      tasks: [{ title: "Write tests", id: "task-1" }],
    });
  });
});

describe("unstable_getInteractableVersions", () => {
  it("returns an empty list when nothing references the instance", () => {
    expect(unstable_getInteractableVersions([], "a", "note")).toEqual([]);
    expect(
      unstable_getInteractableVersions(
        [assistantToolCall("update_note", { id: "b", v: 1 }, undefined, "x")],
        "a",
        "note",
      ),
    ).toEqual([]);
  });

  it("records create, user-edit, and update versions in order", () => {
    const history = [
      assistantCreateCall("a", { v: 1, title: "draft" }),
      userMsg([partialEntry("a", { title: "edited" }, "note")]),
      assistantToolCall(
        "update_note",
        { id: "a", v: 2 },
        { success: true },
        "call-2",
      ),
    ];
    expect(unstable_getInteractableVersions(history, "a", "note")).toEqual([
      { state: { v: 1, title: "draft" }, origin: "create", toolCallId: "a" },
      { state: { v: 1, title: "edited" }, origin: "user-edit" },
      {
        state: { v: 2, title: "edited" },
        origin: "update",
        toolCallId: "call-2",
      },
    ]);
  });

  it("replaces the state on a full user snapshot", () => {
    const history = [
      assistantCreateCall("a", { v: 1, title: "draft" }),
      userMsg([entry("a", { v: 10 }, "note")]),
    ];
    expect(unstable_getInteractableVersions(history, "a", "note")).toEqual([
      { state: { v: 1, title: "draft" }, origin: "create", toolCallId: "a" },
      { state: { v: 10 }, origin: "user-edit" },
    ]);
  });

  it("attributes an id-less update via the result's resolved id", () => {
    const history = [
      assistantCreateCall("a", { v: 1 }),
      assistantToolCall(
        "update_note",
        { v: 2 },
        { success: true, id: "a" },
        "call-2",
      ),
    ];
    expect(unstable_getInteractableVersions(history, "a", "note")).toEqual([
      { state: { v: 1 }, origin: "create", toolCallId: "a" },
      { state: { v: 2 }, origin: "update", toolCallId: "call-2" },
    ]);
  });

  it("excludes an id-less update resolved to another instance", () => {
    const history = [
      assistantCreateCall("a", { v: 1 }),
      assistantToolCall(
        "update_note",
        { v: 2 },
        { success: true, id: "b" },
        "call-2",
      ),
    ];
    expect(unstable_getInteractableVersions(history, "a", "note")).toHaveLength(
      1,
    );
  });

  it("skips rejected update calls", () => {
    const history = [
      assistantCreateCall("a", { v: 1 }),
      assistantToolCall(
        "update_note",
        { id: "a", v: 2 },
        { success: false },
        "call-2",
      ),
    ];
    expect(unstable_getInteractableVersions(history, "a", "note")).toEqual([
      { state: { v: 1 }, origin: "create", toolCallId: "a" },
    ]);
  });

  it("skips partial snapshots and updates that have no baseline", () => {
    const history = [
      userMsg([partialEntry("a", { title: "y" }, "note")]),
      assistantToolCall("update_note", { id: "a", v: 2 }, { success: true }),
    ];
    expect(unstable_getInteractableVersions(history, "a", "note")).toEqual([]);
  });
});

describe("gateInteractableComposerMetadata", () => {
  it("returns undefined when meta is undefined", () => {
    expect(gateInteractableComposerMetadata(undefined, [])).toBeUndefined();
  });

  it("stamps a full baseline on the first send (no prior record in history)", () => {
    const meta = { interactables: [entry("a", { v: 1 })] };
    const gated = gateInteractableComposerMetadata(meta, []);
    expect(gated?.interactables).toEqual([entry("a", { v: 1 })]);
  });

  it("is idempotent: omits an interactable whose state matches its latest snapshot", () => {
    const meta = { interactables: [entry("a", { v: 1 })] };
    const history = [userMsg([entry("a", { v: 1 })])];
    expect(gateInteractableComposerMetadata(meta, history)).toBeUndefined();
  });

  it("omits an unedited tool-created interactable (the model authored its args)", () => {
    const meta = {
      interactables: [entry("a", { v: 1, title: "draft" }, "note")],
    };
    const history = [assistantCreateCall("a", { v: 1, title: "draft" })];
    expect(gateInteractableComposerMetadata(meta, history)).toBeUndefined();
  });

  it("stamps the full state when every field changed", () => {
    const meta = { interactables: [entry("a", { v: 2 })] };
    const history = [userMsg([entry("a", { v: 1 })])];
    const gated = gateInteractableComposerMetadata(meta, history);
    expect(gated?.interactables).toEqual([entry("a", { v: 2 })]);
  });

  it("stamps only the changed fields as a partial snapshot", () => {
    const meta = { interactables: [entry("a", { v: 1, title: "edited" })] };
    const history = [userMsg([entry("a", { v: 1, title: "draft" })])];
    const gated = gateInteractableComposerMetadata(meta, history);
    expect(gated?.interactables).toEqual([
      partialEntry("a", { title: "edited" }),
    ]);
  });

  it("falls back to a full snapshot when a top-level key was removed", () => {
    const meta = { interactables: [entry("a", { v: 1 })] };
    const history = [userMsg([entry("a", { v: 1, title: "draft" })])];
    const gated = gateInteractableComposerMetadata(meta, history);
    expect(gated?.interactables).toEqual([entry("a", { v: 1 })]);
  });

  it("omits an interactable the model already knows via its own update_* call", () => {
    const meta = { interactables: [entry("a", { v: 2 }, "note")] };
    const history = [
      userMsg([entry("a", { v: 1 }, "note")]),
      assistantToolCall("update_note", { id: "a", v: 2 }, { success: true }),
    ];
    expect(gateInteractableComposerMetadata(meta, history)).toBeUndefined();
  });

  it("omits array add state when update results include assigned ids", () => {
    const meta = {
      interactables: [
        entry(
          "board",
          { tasks: [{ title: "Write tests", id: "task-1" }] },
          "taskBoard",
        ),
      ],
    };
    const history = [
      userMsg([entry("board", { tasks: [] }, "taskBoard")]),
      assistantToolCall(
        "update_taskBoard",
        { id: "board", tasks: { add: [{ title: "Write tests" }] } },
        {
          success: true,
          id: "board",
          addedItemIds: { tasks: ["task-1"] },
        },
      ),
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

  it("skips non-user snapshot carriers when folding", () => {
    const meta = { interactables: [entry("a", { v: 999 })] };
    const history = [
      userMsg([entry("a", { v: 1 })]),
      assistantMsg([entry("a", { v: 999 })]),
    ];
    const gated = gateInteractableComposerMetadata(meta, history);
    expect(gated?.interactables).toEqual([entry("a", { v: 999 })]);
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
        userMsg(first!.interactables as Unstable_InteractableSnapshotEntry[]),
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
