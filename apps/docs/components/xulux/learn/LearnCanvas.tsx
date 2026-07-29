"use client";

import { useMemo, useState } from "react";
import { BookOpen, Code2, Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createVirtualArchiveFromTextFiles } from "@/lib/xulux/virtual-archive";
import { XuluxFileBrowser } from "../canvas/XuluxFileBrowser";
import { LearnCurriculumOverview } from "./LearnCurriculumOverview";
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
