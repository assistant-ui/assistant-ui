import type { ParsedFile } from "./types";

export type StagedSelection = {
  stagedHunks: ReadonlyArray<{ fileIndex: number; hunkIndex: number }>;
};

export type DiffHunkRef = {
  fileIndex: number;
  hunkIndex: number;
  key: string;
};

export type StageState = {
  staged: ReadonlySet<string>;
  focusedIndex: number;
};

export type StageAction =
  | { type: "toggle"; key: string }
  | { type: "stage-all"; keys: readonly string[] }
  | { type: "stage-none" }
  | { type: "move-focus"; delta: number; hunkCount: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const stageKey = (fileIndex: number, hunkIndex: number) =>
  `${fileIndex}:${hunkIndex}`;

export const getDiffHunks = (files: ParsedFile[]): DiffHunkRef[] => {
  const hunks: DiffHunkRef[] = [];
  files.forEach((file, fileIndex) => {
    const maxHunk = file.lines.reduce(
      (max, line) => Math.max(max, line.hunkIndex ?? -1),
      -1,
    );
    for (let hunkIndex = 0; hunkIndex <= maxHunk; hunkIndex++) {
      hunks.push({ fileIndex, hunkIndex, key: stageKey(fileIndex, hunkIndex) });
    }
  });
  return hunks;
};

export const createStageState = (keys: readonly string[]): StageState => ({
  staged: new Set(keys),
  focusedIndex: 0,
});

export const stageReducer = (
  state: StageState,
  action: StageAction,
): StageState => {
  switch (action.type) {
    case "toggle": {
      const staged = new Set(state.staged);
      if (staged.has(action.key)) staged.delete(action.key);
      else staged.add(action.key);
      return { ...state, staged };
    }

    case "stage-all":
      return { ...state, staged: new Set(action.keys) };

    case "stage-none":
      return { ...state, staged: new Set() };

    case "move-focus": {
      if (action.hunkCount === 0) return state;
      const next = clamp(
        state.focusedIndex + action.delta,
        0,
        action.hunkCount - 1,
      );
      return next === state.focusedIndex
        ? state
        : { ...state, focusedIndex: next };
    }
  }
};

export const toStagedSelection = (
  staged: ReadonlySet<string>,
): StagedSelection => {
  const stagedHunks = [...staged]
    .map((key) => {
      const [fileIndex, hunkIndex] = key.split(":");
      return { fileIndex: Number(fileIndex), hunkIndex: Number(hunkIndex) };
    })
    .sort((a, b) => a.fileIndex - b.fileIndex || a.hunkIndex - b.hunkIndex);
  return { stagedHunks };
};
