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
      setStatus("idle");
      setPreviousFiles(EMPTY_FILES);
      setCurrentFiles(EMPTY_FILES);
      setError(null);
      return;
    }

    const controller = new AbortController();
    const load = async (stageId: string) => {
      const params = new URLSearchParams({ courseId: course.id, stageId });
      const response = await fetch(`/api/xulux/learn/source?${params}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Source request failed (${response.status})`);
      }

      const payload = (await response.json()) as { files?: unknown };
      if (!payload.files || typeof payload.files !== "object") {
        throw new Error("Source response was invalid.");
      }
      return payload.files as LearnStageFiles;
    };

    setStatus("loading");
    setError(null);
    void Promise.all([
      load(selectedStep.stageId),
      previousStep ? load(previousStep.stageId) : Promise.resolve(EMPTY_FILES),
    ])
      .then(([nextCurrentFiles, nextPreviousFiles]) => {
        setCurrentFiles(nextCurrentFiles);
        setPreviousFiles(nextPreviousFiles);
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
