"use client";

import { useMemo, useState } from "react";
import {
  BookOpen,
  Check,
  Circle,
  Code2,
  Eye,
  Loader2,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createVirtualArchiveFromTextFiles } from "@/lib/xulux/virtual-archive";
import { XuluxFileBrowser } from "../canvas/XuluxFileBrowser";
import type {
  LearnCourseDefinition,
  LearnProgress,
} from "@/lib/xulux/learn/types";
import { useLearnMode } from "./LearnModeContext";
import { useLearnStageSource } from "./LearnStageSourceContext";
import { LearnFileView, type LearnDiffViewMode } from "./LearnFileView";

const tabs = [
  { id: "curriculum" as const, label: "Curriculum", icon: BookOpen },
  { id: "preview" as const, label: "Preview", icon: Eye },
  { id: "files" as const, label: "Files", icon: Code2 },
];

export function LearnCanvas({ onStartCourse }: { onStartCourse: () => void }) {
  const {
    course,
    progress,
    activeTab,
    selectedFile,
    selectedFileMode,
    selectStep,
    openTab,
    openFile,
  } = useLearnMode();
  const source = useLearnStageSource();
  const selectedStep =
    course.steps.find(({ id }) => id === progress.selectedStepId) ?? null;
  const [diffViewMode, setDiffViewMode] =
    useState<LearnDiffViewMode>("unified");

  const archive = useMemo(
    () =>
      source.status === "ready"
        ? createVirtualArchiveFromTextFiles({
            ...source.previousFiles,
            ...source.currentFiles,
          })
        : null,
    [source],
  );
  const fileStatuses = useMemo(
    () =>
      new Map(
        [...source.records].map(([path, record]) => [path, record.status]),
      ),
    [source.records],
  );
  const selectedRecord = selectedFile
    ? source.records.get(selectedFile)
    : undefined;

  const openDefaultFile = () => {
    const path = selectedFile ?? selectedStep?.focusFiles[0];
    if (!path) {
      openTab("files");
      return;
    }
    const record = source.records.get(path);
    openFile(path, record?.status === "unchanged" ? "source" : "diff");
  };

  return (
    <section
      className="bg-background flex h-full min-h-0 flex-col"
      aria-label="Course workspace"
    >
      <div className="flex shrink-0 gap-1 overflow-x-auto border-b p-1.5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            size="sm"
            variant={activeTab === id ? "secondary" : "ghost"}
            className="h-8 gap-1.5"
            disabled={id !== "curriculum" && !selectedStep}
            onClick={() => (id === "files" ? openDefaultFile() : openTab(id))}
          >
            <Icon className="size-3.5" />
            {label}
          </Button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
        {activeTab === "curriculum" && (
          <LearnCurriculumOverview
            course={course}
            progress={progress}
            onStartCourse={onStartCourse}
            onSelectStep={selectStep}
          />
        )}
        {selectedStep && (
          <div
            aria-hidden={activeTab !== "preview"}
            className={cn(
              "absolute inset-0",
              activeTab === "preview"
                ? "z-10 opacity-100"
                : "pointer-events-none z-0 opacity-0",
            )}
          >
            <iframe
              className="h-full w-full border-0 bg-white"
              title={`${selectedStep.title} preview`}
              src={course.stages[selectedStep.stageId]!.previewPath}
            />
          </div>
        )}
        {activeTab === "files" && source.status === "loading" && (
          <LoadingSource />
        )}
        {activeTab === "files" && source.status === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-sm">
            <p className="text-destructive">{source.error}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={source.retry}
            >
              Retry source
            </Button>
          </div>
        )}
        {activeTab === "files" && archive && (
          <XuluxFileBrowser
            archive={archive}
            selectedPath={selectedFile}
            fileStatuses={fileStatuses}
            onSelectedPathChange={(path) => {
              const record = source.records.get(path);
              openFile(
                path,
                record?.status === "unchanged" ? "source" : "diff",
              );
            }}
            renderSelectedFile={() =>
              selectedRecord ? (
                <LearnFileView
                  record={selectedRecord}
                  displayMode={selectedFileMode}
                  diffViewMode={diffViewMode}
                  variant="full"
                  onDisplayModeChange={(mode) =>
                    openFile(selectedRecord.path, mode)
                  }
                  onDiffViewModeChange={setDiffViewMode}
                />
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
                  This file is unavailable in the selected stage.
                </div>
              )
            }
          />
        )}
      </div>
    </section>
  );
}

function LoadingSource() {
  return (
    <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
      <Loader2 className="size-4 animate-spin" />
      Loading source…
    </div>
  );
}

function LearnCurriculumOverview({
  course,
  progress,
  onStartCourse,
  startDisabled = false,
  onSelectStep,
}: {
  course: LearnCourseDefinition;
  progress: LearnProgress;
  onStartCourse: () => void;
  startDisabled?: boolean;
  onSelectStep?: (stepId: string) => void;
}) {
  const started = progress.status !== "not_started";
  const completedCount = progress.completedStepIds.length;

  return (
    <section
      className="bg-muted/20 flex h-full min-h-0 flex-col overflow-y-auto p-5 sm:p-8"
      aria-label="Course curriculum"
    >
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center">
        <div className="text-primary bg-background mb-4 flex size-10 items-center justify-center rounded-xl border shadow-sm">
          <BookOpen className="size-5" />
        </div>
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
          Learn assistant-ui
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {course.title}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-6 sm:text-base">
          {course.outcome}
        </p>
        <div className="mt-7 flex items-center justify-between text-sm">
          <span className="font-medium">Curriculum</span>
          <span className="text-muted-foreground">
            {completedCount} of {course.steps.length} complete
          </span>
        </div>
        <div className="bg-border mt-2 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-primary h-full rounded-full transition-[width]"
            style={{
              width: `${(completedCount / course.steps.length) * 100}%`,
            }}
          />
        </div>
        <ol className="bg-background mt-4 overflow-hidden rounded-xl border">
          {course.steps.map((step, index) => {
            const complete = progress.completedStepIds.includes(step.id);
            const current = progress.currentStepId === step.id;
            return (
              <li key={step.id} className="border-b last:border-b-0">
                <button
                  type="button"
                  disabled={!started || (!complete && !current)}
                  onClick={() => onSelectStep?.(step.id)}
                  className="hover:bg-muted/50 flex w-full items-center gap-3 px-4 py-3 text-left disabled:cursor-default disabled:hover:bg-transparent"
                >
                  {complete ? (
                    <span className="bg-primary text-primary-foreground flex size-6 shrink-0 items-center justify-center rounded-full">
                      <Check className="size-3.5" />
                    </span>
                  ) : (
                    <span className="text-muted-foreground flex size-6 shrink-0 items-center justify-center">
                      <Circle
                        className="size-5"
                        fill={current ? "currentColor" : "none"}
                      />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="text-muted-foreground block text-xs">
                      Step {index + 1}
                    </span>
                    <span className="block truncate text-sm font-medium">
                      {step.title}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {!started ? (
          <Button
            type="button"
            size="lg"
            className="mt-6 w-full gap-2 sm:w-fit"
            onClick={onStartCourse}
            disabled={startDisabled}
          >
            <Play className="size-4" fill="currentColor" />
            Start course
          </Button>
        ) : (
          <p className="text-muted-foreground mt-5 text-sm">
            Your course thread is active. Continue the conversation in the Learn
            chat.
          </p>
        )}
      </div>
    </section>
  );
}
