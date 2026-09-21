"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  createLearnFileRecords,
  type LearnFileRecord,
} from "@/lib/xulux/learn/file-reference";
import { compareStageFiles } from "@/lib/xulux/learn/stage-diff";
import { fetchLearnStageFiles } from "@/lib/xulux/learn/stage-source-client";
import type { LearnStageFiles } from "@/lib/xulux/learn/stage-source";
import type {
  LearnStageChanges,
  LearnStepDefinition,
} from "@/lib/xulux/learn/types";
import { useLearnMode } from "./LearnModeContext";

type SourceStatus = "idle" | "loading" | "ready" | "error";

type LearnStageSourceContextValue = {
  status: SourceStatus;
  selectedStep: LearnStepDefinition | null;
  previousFiles: LearnStageFiles;
  currentFiles: LearnStageFiles;
  changes: LearnStageChanges;
  records: ReadonlyMap<string, LearnFileRecord>;
  error: string | null;
  retry: () => void;
};

const EMPTY_FILES: LearnStageFiles = {};
const EMPTY_CHANGES: LearnStageChanges = {
  files: [],
  additions: 0,
  deletions: 0,
};
const EMPTY_RECORDS = new Map<string, LearnFileRecord>();

const LearnStageSourceContext =
  createContext<LearnStageSourceContextValue | null>(null);

export function LearnStageSourceProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { course, progress } = useLearnMode();
  const selectedIndex = course.steps.findIndex(
    ({ id }) => id === progress.selectedStepId,
  );
  const selectedStep =
    selectedIndex === -1 ? null : course.steps[selectedIndex]!;
  const previousStep =
    selectedIndex > 0 ? course.steps[selectedIndex - 1]! : null;
  const [status, setStatus] = useState<SourceStatus>("idle");
  const [previousFiles, setPreviousFiles] =
    useState<LearnStageFiles>(EMPTY_FILES);
  const [currentFiles, setCurrentFiles] =
    useState<LearnStageFiles>(EMPTY_FILES);
  const [error, setError] = useState<string | null>(null);
  const [sourceVersion, setSourceVersion] = useState(0);

  useEffect(() => {
    if (!selectedStep) {
      // The status transitions are the front half of the fetch below, keyed on
      // the same inputs, so they stay with it rather than splitting across a
      // render-time copy of this dependency list.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStatus("idle");
      setPreviousFiles(EMPTY_FILES);
      setCurrentFiles(EMPTY_FILES);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setStatus("loading");
    setError(null);
    void Promise.all([
      fetchLearnStageFiles(course.id, selectedStep.stageId, controller.signal),
      previousStep
        ? fetchLearnStageFiles(
            course.id,
            previousStep.stageId,
            controller.signal,
          )
        : Promise.resolve(EMPTY_FILES),
    ])
      .then(([nextCurrentFiles, nextPreviousFiles]) => {
        if (controller.signal.aborted) return;
        const resolvedPreviousFiles = previousStep
          ? nextPreviousFiles
          : nextCurrentFiles;
        setCurrentFiles(nextCurrentFiles);
        setPreviousFiles(resolvedPreviousFiles);
        setStatus("ready");
      })
      .catch((nextError: unknown) => {
        if (controller.signal.aborted) return;
        setStatus("error");
        setError(
          nextError instanceof Error ? nextError.message : String(nextError),
        );
      });

    return () => controller.abort();
  }, [course.id, previousStep, selectedStep, sourceVersion]);

  const records = useMemo(
    () =>
      status === "ready"
        ? createLearnFileRecords(previousFiles, currentFiles)
        : EMPTY_RECORDS,
    [currentFiles, previousFiles, status],
  );
  const changes = useMemo(
    () =>
      status === "ready"
        ? compareStageFiles(previousFiles, currentFiles)
        : EMPTY_CHANGES,
    [currentFiles, previousFiles, status],
  );
  const retry = useCallback(
    () => setSourceVersion((version) => version + 1),
    [],
  );
  const value = useMemo<LearnStageSourceContextValue>(
    () => ({
      status,
      selectedStep,
      previousFiles,
      currentFiles,
      changes,
      records,
      error,
      retry,
    }),
    [
      changes,
      currentFiles,
      error,
      previousFiles,
      records,
      retry,
      selectedStep,
      status,
    ],
  );

  return (
    <LearnStageSourceContext.Provider value={value}>
      {children}
    </LearnStageSourceContext.Provider>
  );
}

export function useLearnStageSource() {
  const value = useContext(LearnStageSourceContext);
  if (!value) {
    throw new Error("useLearnStageSource requires LearnStageSourceProvider");
  }
  return value;
}

export function useOptionalLearnStageSource() {
  return useContext(LearnStageSourceContext);
}
