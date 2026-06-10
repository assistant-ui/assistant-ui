import { afterEach, describe, expect, it, vi } from "vitest";
import {
  findLatestSnapshotEntry,
  gateInteractableComposerMetadata,
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

const entry = (
  id: string,
  state: unknown,
  name = id,
): InteractableSnapshotEntry => ({ id, name, state });

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

  it("returns undefined when nothing is pending and no other keys remain", () => {
    const meta = { interactables: [entry("a", { v: 1 })] };
    const history = [userMsg([entry("a", { v: 1 })])];
    expect(gateInteractableComposerMetadata(meta, history)).toBeUndefined();
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

      // Second send: history already carries the snapshot, yet a Date never
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
