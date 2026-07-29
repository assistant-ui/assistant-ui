"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
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

  useEffect(() => {
    const selectedStep = course.steps.find(
      ({ id }) => id === progress.selectedStepId,
    );
    setSelectedFile(selectedStep?.focusFiles[0] ?? null);
    setSelectedFileMode("diff");
  }, [course.steps, progress.selectedStepId]);

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
