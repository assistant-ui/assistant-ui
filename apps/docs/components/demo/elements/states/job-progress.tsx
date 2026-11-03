"use client";

import {
  JobProgress,
  type JobStage,
} from "@/components/assistant-ui/elements/job-progress";
import { defineStates } from "./types";

const noop = () => {};

const STAGES: readonly JobStage[] = [
  { name: "clone", weight: 1, description: "Fetching the branch" },
  { name: "install", weight: 4, description: "Restoring dependencies" },
  { name: "build", weight: 3, description: "Compiling packages" },
  { name: "test", weight: 2, description: "Running the suite" },
];

const base = {
  title: "Verify the fix on CI",
  stages: STAGES,
  onCancel: noop,
};

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "starting",
    label: "Starting",
    note: "The job has just been queued and the first stage has no progress yet.",
    Component: () => (
      <JobProgress
        {...base}
        stageIndex={0}
        stageProgress={0}
        eta="about 4 min"
      />
    ),
  },
  {
    key: "running",
    label: "Running",
    note: "Midway through the build with an ETA and a cancel button.",
    Component: () => (
      <JobProgress
        {...base}
        stageIndex={2}
        stageProgress={0.4}
        eta="about 1 min"
      />
    ),
  },
  {
    key: "success",
    label: "Done",
    note: "Every stage finished and the bar is full.",
    Component: () => (
      <JobProgress
        {...base}
        stageIndex={STAGES.length}
        stageProgress={1}
        eta="seconds"
        outcome={{ status: "success", summary: "All 412 tests passed." }}
        elapsedMs={254_000}
      />
    ),
  },
  {
    key: "partial",
    label: "Partial",
    note: "The job ended with only some of its work done.",
    Component: () => (
      <JobProgress
        {...base}
        stageIndex={3}
        stageProgress={0.5}
        eta="seconds"
        outcome={{
          status: "partial",
          summary: "Build passed. Tests stopped after the preview timed out.",
        }}
        elapsedMs={72_000}
      />
    ),
  },
  {
    key: "error",
    label: "Failed",
    note: "A stage failed and the job stopped there.",
    Component: () => (
      <JobProgress
        {...base}
        stageIndex={2}
        stageProgress={0.7}
        eta="about 1 min"
        outcome={{
          status: "failed",
          summary:
            "Build failed in packages/react: Cannot find module './runtime/useDraft'.",
        }}
        elapsedMs={98_000}
      />
    ),
  },
  {
    key: "cancelled",
    label: "Cancelled",
    note: "The user cancelled the job during install.",
    Component: () => (
      <JobProgress
        {...base}
        stageIndex={1}
        stageProgress={0.3}
        eta="about 3 min"
        outcome={{ status: "cancelled", summary: "Cancelled during install." }}
        elapsedMs={21_000}
      />
    ),
  },
  {
    key: "no-cancel",
    label: "No cancel",
    note: "A job that cannot be stopped shows no cancel button.",
    Component: () => (
      <JobProgress
        title="Migrate the threads table"
        stages={[
          { name: "snapshot", weight: 1, description: "Taking a snapshot" },
          { name: "copy", weight: 6, description: "Copying 2.4M rows" },
          { name: "swap", weight: 1, description: "Swapping tables" },
        ]}
        stageIndex={1}
        stageProgress={0.25}
        eta="about 12 min"
      />
    ),
  },
]);
