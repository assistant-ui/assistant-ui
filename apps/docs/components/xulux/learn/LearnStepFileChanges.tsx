"use client";

import { useEffect, useState } from "react";
import { ChevronDown, FileCode2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createLearnFileRecords,
  type LearnFileRecord,
} from "@/lib/xulux/learn/file-reference";
import { fetchLearnStageFiles } from "@/lib/xulux/learn/stage-source-client";
import type { LearnFileChange } from "@/lib/xulux/learn/types";
import { cn } from "@/lib/utils";
import { LearnFileView } from "./LearnFileView";
import { useLearnMode } from "./LearnModeContext";

const EMPTY_FILES = {};

export function LearnStepFileChanges({
  stepId,
  stageId,
  files,
}: {
  stepId: string;
  stageId: string;
  files: LearnFileChange[];
}) {
  const { course } = useLearnMode();
  const stepIndex = course.steps.findIndex(({ id }) => id === stepId);
  const previousStageId =
    stepIndex > 0 ? course.steps[stepIndex - 1]!.stageId : null;
  const sourceKey = `${course.id}:${previousStageId ?? ""}:${stageId}`;
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<{
    key: string;
    records: ReadonlyMap<string, LearnFileRecord>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceVersion, setSourceVersion] = useState(0);
  const records = loaded?.key === sourceKey ? loaded.records : null;

  useEffect(() => {
    if (!expandedPath || records) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);
    void Promise.all([
      fetchLearnStageFiles(course.id, stageId, controller.signal),
      previousStageId
        ? fetchLearnStageFiles(course.id, previousStageId, controller.signal)
        : Promise.resolve(EMPTY_FILES),
    ])
      .then(([currentFiles, previousFiles]) => {
        setLoaded({
          key: sourceKey,
          records: createLearnFileRecords(
            previousStageId ? previousFiles : currentFiles,
            currentFiles,
          ),
        });
        setLoading(false);
      })
      .catch((nextError: unknown) => {
        if (controller.signal.aborted) return;
        setLoading(false);
        setError(
          nextError instanceof Error ? nextError.message : String(nextError),
        );
      });

    return () => controller.abort();
  }, [
    course.id,
    expandedPath,
    previousStageId,
    records,
    sourceKey,
    sourceVersion,
    stageId,
  ]);

  if (files.length === 0) return null;

  return (
    <ul className="space-y-2" aria-label="Files changed in this step">
      {files.map((file) => {
        const expanded = expandedPath === file.path;
        const record = records?.get(file.path);

        return (
          <li key={file.path} className="overflow-hidden rounded-lg border">
            <button
              type="button"
              aria-expanded={expanded}
              className={cn(
                "hover:bg-muted/70 flex w-full items-center gap-2 px-3 py-2 text-left transition-colors",
                expanded && "bg-muted/50",
              )}
              onClick={() =>
                setExpandedPath((current) =>
                  current === file.path ? null : file.path,
                )
              }
            >
              <FileCode2 className="text-muted-foreground size-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs">
                {file.path}
              </span>
              <span className="flex shrink-0 gap-1.5 text-xs">
                <span className="text-green-600">+{file.additions}</span>
                <span className="text-red-600">−{file.deletions}</span>
              </span>
              <ChevronDown
                className={cn(
                  "text-muted-foreground size-3.5 shrink-0 transition-transform",
                  expanded && "rotate-180",
                )}
              />
            </button>
            {expanded ? (
              <div className="flex min-h-0 border-t">
                {record ? (
                  <LearnFileView
                    record={record}
                    displayMode="diff"
                    variant="inline"
                    showHeader={false}
                  />
                ) : error ? (
                  <div className="flex w-full items-center justify-between gap-3 p-3 text-xs">
                    <span className="text-destructive">{error}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSourceVersion((version) => version + 1)}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="text-muted-foreground flex w-full items-center justify-center gap-2 p-4 text-xs">
                    <Loader2 className="size-3.5 animate-spin" />
                    {loading ? "Loading changes…" : "Preparing changes…"}
                  </div>
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
