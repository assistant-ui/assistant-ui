import { describe, expect, it } from "vitest";
import {
  createStageState,
  getDiffHunks,
  stageKey,
  stageReducer,
  toStagedSelection,
} from "./diff-stage";
import type { ParsedFile } from "./types";

const fileWithHunks = (hunkIndices: number[]): ParsedFile => ({
  oldName: "f.txt",
  newName: "f.txt",
  additions: 0,
  deletions: 0,
  lines: hunkIndices.map((hunkIndex) => ({
    type: "add" as const,
    content: "x",
    hunkIndex,
  })),
});

describe("getDiffHunks", () => {
  it("enumerates hunks per file from the max hunkIndex", () => {
    const hunks = getDiffHunks([fileWithHunks([0, 0, 1]), fileWithHunks([0])]);
    expect(hunks).toEqual([
      { fileIndex: 0, hunkIndex: 0, key: "0:0" },
      { fileIndex: 0, hunkIndex: 1, key: "0:1" },
      { fileIndex: 1, hunkIndex: 0, key: "1:0" },
    ]);
  });

  it("emits no hunks for a file with no change lines", () => {
    const file: ParsedFile = {
      oldName: "f.txt",
      newName: "f.txt",
      additions: 0,
      deletions: 0,
      lines: [{ type: "normal", content: "a" }],
    };
    expect(getDiffHunks([file])).toEqual([]);
  });
});

describe("stageReducer", () => {
  const keys = ["0:0", "0:1"];

  it("defaults to all hunks staged", () => {
    const state = createStageState(keys);
    expect([...state.staged]).toEqual(keys);
    expect(state.focusedIndex).toBe(0);
  });

  it("toggles a hunk out and back in", () => {
    let state = createStageState(keys);
    state = stageReducer(state, { type: "toggle", key: "0:0" });
    expect(state.staged.has("0:0")).toBe(false);
    state = stageReducer(state, { type: "toggle", key: "0:0" });
    expect(state.staged.has("0:0")).toBe(true);
  });

  it("stages all and none", () => {
    let state = createStageState(keys);
    state = stageReducer(state, { type: "stage-none" });
    expect(state.staged.size).toBe(0);
    state = stageReducer(state, { type: "stage-all", keys });
    expect([...state.staged]).toEqual(keys);
  });

  it("clamps focus movement to bounds", () => {
    let state = createStageState(keys);
    state = stageReducer(state, {
      type: "move-focus",
      delta: -1,
      hunkCount: 2,
    });
    expect(state.focusedIndex).toBe(0);
    state = stageReducer(state, { type: "move-focus", delta: 1, hunkCount: 2 });
    expect(state.focusedIndex).toBe(1);
    state = stageReducer(state, { type: "move-focus", delta: 1, hunkCount: 2 });
    expect(state.focusedIndex).toBe(1);
  });

  it("ignores focus movement when there are no hunks", () => {
    const state = createStageState([]);
    const next = stageReducer(state, {
      type: "move-focus",
      delta: 1,
      hunkCount: 0,
    });
    expect(next).toBe(state);
  });
});

describe("toStagedSelection", () => {
  it("parses and sorts staged keys", () => {
    const selection = toStagedSelection(new Set(["1:0", "0:1", "0:0"]));
    expect(selection.stagedHunks).toEqual([
      { fileIndex: 0, hunkIndex: 0 },
      { fileIndex: 0, hunkIndex: 1 },
      { fileIndex: 1, hunkIndex: 0 },
    ]);
  });

  it("builds keys with stageKey", () => {
    expect(stageKey(2, 3)).toBe("2:3");
  });
});
