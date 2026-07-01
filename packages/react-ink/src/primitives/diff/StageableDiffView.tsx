import { useMemo, useReducer, useRef } from "react";
import { Box, Text, useFocus, useInput } from "ink";

import { DiffContent } from "./DiffContent";
import { DiffRoot } from "./DiffRoot";
import { getDiffFiles } from "./diff-utils";
import {
  createStageState,
  getDiffHunks,
  stageKey,
  stageReducer,
  toStagedSelection,
  type StageAction,
  type StagedSelection,
} from "./diff-stage";
import type { DiffViewProps } from "./DiffView";
import type { ParsedFile, ParsedLine } from "./types";

export type StageableDiffViewProps = DiffViewProps & {
  onStageChange?: ((staged: StagedSelection) => void) | undefined;
  isActive?: boolean | undefined;
};

const INDICATOR: Record<ParsedLine["type"], string> = {
  add: "+",
  del: "-",
  normal: " ",
};

const firstChangeLinesOf = (file: ParsedFile) => {
  const seen = new Set<number>();
  const markers = new Set<ParsedLine>();
  for (const line of file.lines) {
    if (
      line.type !== "normal" &&
      line.hunkIndex !== undefined &&
      !seen.has(line.hunkIndex)
    ) {
      seen.add(line.hunkIndex);
      markers.add(line);
    }
  }
  return markers;
};

const StageLine = ({
  line,
  showMarker,
  staged,
  focused,
  showLineNumbers,
}: {
  line: ParsedLine;
  showMarker: boolean;
  staged: boolean;
  focused: boolean;
  showLineNumbers: boolean;
}) => {
  const lineNum = line.type === "add" ? line.newLineNumber : line.oldLineNumber;
  const numStr = lineNum !== undefined ? String(lineNum).padStart(4) : "    ";
  const gutter = showMarker ? (staged ? "[x]" : "[ ]") : "   ";
  const body = `${INDICATOR[line.type]} ${line.content}`;
  const color = staged
    ? line.type === "add"
      ? "green"
      : line.type === "del"
        ? "red"
        : undefined
    : undefined;

  return (
    <Box>
      <Text inverse={focused} color={focused ? "cyan" : undefined}>
        {gutter}
      </Text>
      <Text> </Text>
      {showLineNumbers && <Text dimColor>{`${numStr} `}</Text>}
      <Text color={color} dimColor={!staged}>
        {body}
      </Text>
    </Box>
  );
};

export const StageableDiffView = ({
  patch,
  oldFile,
  newFile,
  showLineNumbers,
  contextLines,
  maxLines,
  onStageChange,
  isActive = true,
  ...boxProps
}: StageableDiffViewProps) => {
  const oldContent = oldFile?.content;
  const oldName = oldFile?.name;
  const newContent = newFile?.content;
  const newName = newFile?.name;

  const files = useMemo(
    () =>
      getDiffFiles({
        patch,
        oldFile:
          oldContent !== undefined
            ? { content: oldContent, name: oldName }
            : undefined,
        newFile:
          newContent !== undefined
            ? { content: newContent, name: newName }
            : undefined,
      }),
    [patch, oldContent, oldName, newContent, newName],
  );

  const hunks = useMemo(() => getDiffHunks(files), [files]);
  const hunkKeys = useMemo(() => hunks.map((h) => h.key), [hunks]);

  const [state, dispatch] = useReducer(
    stageReducer,
    hunkKeys,
    createStageState,
  );
  const stateRef = useRef(state);
  stateRef.current = state;

  const { isFocused } = useFocus({ isActive });

  // run the reducer eagerly so onStageChange fires synchronously with the keypress
  const apply = (action: StageAction) => {
    const current = stateRef.current;
    const next = stageReducer(current, action);
    stateRef.current = next;
    dispatch(action);
    if (next.staged !== current.staged) {
      onStageChange?.(toStagedSelection(next.staged));
    }
  };

  useInput(
    (input, key) => {
      if (key.downArrow || input === "j") {
        apply({ type: "move-focus", delta: 1, hunkCount: hunks.length });
        return;
      }
      if (key.upArrow || input === "k") {
        apply({ type: "move-focus", delta: -1, hunkCount: hunks.length });
        return;
      }
      if (input === " ") {
        const focusedKey = hunks[stateRef.current.focusedIndex]?.key;
        if (focusedKey) apply({ type: "toggle", key: focusedKey });
        return;
      }
      if (input === "a") {
        apply({ type: "stage-all", keys: hunkKeys });
        return;
      }
      if (input === "n") {
        apply({ type: "stage-none" });
      }
    },
    { isActive: isFocused && isActive },
  );

  const focusedKey = hunks[state.focusedIndex]?.key;

  return (
    <DiffRoot files={files} {...boxProps}>
      {files.length === 0 ? (
        <Text dimColor>No diff content</Text>
      ) : (
        files.map((file, fileIndex) => {
          const markers = firstChangeLinesOf(file);
          const displayName = file.newName ?? file.oldName;

          return (
            <Box key={fileIndex} flexDirection="column">
              <Text bold>{displayName}</Text>
              <DiffContent
                fileIndex={fileIndex}
                contextLines={contextLines}
                maxLines={maxLines}
                renderLine={({ line }) => {
                  const key =
                    line.hunkIndex !== undefined
                      ? stageKey(fileIndex, line.hunkIndex)
                      : undefined;
                  return (
                    <StageLine
                      line={line}
                      showMarker={markers.has(line)}
                      staged={key !== undefined && state.staged.has(key)}
                      focused={key !== undefined && key === focusedKey}
                      showLineNumbers={showLineNumbers ?? true}
                    />
                  );
                }}
              />
            </Box>
          );
        })
      )}
    </DiffRoot>
  );
};
