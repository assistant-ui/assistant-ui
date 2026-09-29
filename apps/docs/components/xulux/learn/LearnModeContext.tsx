"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuiState, type ToolCallMessagePart } from "@assistant-ui/react";
import { analytics } from "@/lib/analytics";
import { applyLearnCourseStepResult } from "@/lib/xulux/learn/progress";
import { parseLearnCourseStepResult } from "@/lib/xulux/learn/tool-result";
import {
  useXuluxAnalytics,
  withXuluxContext,
} from "@/lib/xulux/analytics-context";
import type {
  LearnCourseDefinition,
  LearnProgress,
} from "@/lib/xulux/learn/types";

type LearnCanvasTab = "curriculum" | "preview" | "files";
export type LearnFileDisplayMode = "source" | "diff";

type LearnModeContextValue = {
  course: LearnCourseDefinition;
  progress: LearnProgress;
  updateProgress: (progress: LearnProgress) => void;
  activeTab: LearnCanvasTab;
  selectedFile: string | null;
  selectedFileMode: LearnFileDisplayMode;
  selectStep: (stepId: string) => void;
  openTab: (tab: LearnCanvasTab) => void;
  openFile: (path: string, mode: LearnFileDisplayMode) => void;
};

const LearnModeContext = createContext<LearnModeContextValue | null>(null);

export function LearnModeProvider({
  course,
  progress,
  updateProgress,
  children,
}: {
  course: LearnCourseDefinition;
  progress: LearnProgress;
  updateProgress: (progress: LearnProgress) => void;
  children: ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<LearnCanvasTab>("curriculum");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileMode, setSelectedFileMode] =
    useState<LearnFileDisplayMode>("source");

  const [fileScope, setFileScope] = useState<{
    steps: typeof course.steps;
    selectedStepId: typeof progress.selectedStepId;
  } | null>(null);

  if (
    fileScope === null ||
    fileScope.steps !== course.steps ||
    fileScope.selectedStepId !== progress.selectedStepId
  ) {
    setFileScope({
      steps: course.steps,
      selectedStepId: progress.selectedStepId,
    });
    const selectedStep = course.steps.find(
      ({ id }) => id === progress.selectedStepId,
    );
    setSelectedFile(selectedStep?.focusFiles[0] ?? null);
    setSelectedFileMode("diff");
  }

  const value = useMemo<LearnModeContextValue>(
    () => ({
      course,
      progress,
      updateProgress,
      activeTab,
      selectedFile,
      selectedFileMode,
      selectStep: (stepId) => {
        updateProgress({
          ...progress,
          selectedStepId: stepId,
          updatedAt: Date.now(),
        });
        setActiveTab("preview");
      },
      openTab: (tab) => {
        setActiveTab(tab);
      },
      openFile: (path, mode) => {
        setActiveTab("files");
        setSelectedFile(path);
        setSelectedFileMode(mode);
      },
    }),
    [
      activeTab,
      course,
      progress,
      selectedFile,
      selectedFileMode,
      updateProgress,
    ],
  );

  return (
    <LearnModeContext.Provider value={value}>
      {children}
    </LearnModeContext.Provider>
  );
}

export function useLearnMode() {
  const value = useContext(LearnModeContext);
  if (!value) throw new Error("useLearnMode requires LearnModeProvider");
  return value;
}

export function useOptionalLearnMode() {
  return useContext(LearnModeContext);
}

export function LearnCourseObserver() {
  const { progress, updateProgress, openTab } = useLearnMode();
  const analyticsCtx = useXuluxAnalytics();
  const handledRef = useRef(new Set<string>());
  const latestCall = useAuiState((state) => {
    const parts: unknown[] = [];
    for (const message of state.thread.messages ?? []) {
      if (message.role === "assistant") parts.push(...message.content);
    }
    return parts
      .filter(
        (part): part is ToolCallMessagePart =>
          !!part &&
          typeof part === "object" &&
          "type" in part &&
          part.type === "tool-call" &&
          "toolName" in part &&
          part.toolName === "getNextCourseStep",
      )
      .at(-1);
  });
  const parsed = useMemo(() => {
    if (!latestCall) return null;
    const result = (
      latestCall as ToolCallMessagePart & {
        result?: unknown;
        toolCallId?: string;
      }
    ).result;
    const payload = parseLearnCourseStepResult(result);
    if (!payload) return null;
    return {
      id:
        (latestCall as ToolCallMessagePart & { toolCallId?: string })
          .toolCallId ?? JSON.stringify(payload),
      payload,
    };
  }, [latestCall]);

  useEffect(() => {
    if (!parsed || handledRef.current.has(parsed.id)) return;
    handledRef.current.add(parsed.id);
    const alreadyApplied =
      "finalStage" in parsed.payload
        ? progress.status === "completed"
        : progress.currentStepId === parsed.payload.step.id;
    if (alreadyApplied) return;

    const next = applyLearnCourseStepResult(progress, parsed.payload);
    updateProgress(next);
    openTab("preview");

    if (!("finalStage" in parsed.payload)) {
      analytics.xulux.learnStepAdvanced(
        withXuluxContext(analyticsCtx, {
          course_id: progress.courseId,
          step_id: parsed.payload.step.id,
          step_index: parsed.payload.step.index,
        }),
      );
    }

    if (next.status === "completed") {
      analytics.xulux.learnCourseCompleted(
        withXuluxContext(analyticsCtx, {
          course_id: progress.courseId,
        }),
      );
    }
  }, [analyticsCtx, openTab, parsed, progress, updateProgress]);

  return null;
}
