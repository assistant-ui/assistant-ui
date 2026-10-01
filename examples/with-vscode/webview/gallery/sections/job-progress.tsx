import {
  JobProgress,
  type JobStage,
} from "@assistant-ui/ui/components/assistant-ui/elements/job-progress.tsx";
import { defineSections } from "../types";
import { State, States, noop } from "./_states";

const STAGES: readonly JobStage[] = [
  { name: "clone", weight: 1, description: "Fetching the branch" },
  { name: "install", weight: 4, description: "Restoring dependencies" },
  { name: "build", weight: 3, description: "Compiling packages" },
  { name: "test", weight: 2, description: "Running the suite" },
];

const JOB = { title: "Verify the fix on CI", stages: STAGES };

export default defineSections([
  {
    id: "job-progress",
    title: "Job progress",
    category: "agents",
    notes:
      "Queued (first stage, no progress) and running mid-build, both cancellable.",
    render: () => (
      <States>
        <State label="queued">
          <JobProgress
            {...JOB}
            stageIndex={0}
            stageProgress={0}
            eta="about 5 min"
            onCancel={noop}
          />
        </State>
        <State label="running">
          <JobProgress
            {...JOB}
            stageIndex={2}
            stageProgress={0.6}
            eta="about 1 min"
            onCancel={noop}
          />
        </State>
      </States>
    ),
  },
  {
    id: "job-progress-outcomes",
    title: "Job progress outcomes",
    category: "agents",
    notes: "Done without an outcome, success, partial, failed and cancelled.",
    render: () => (
      <States>
        <State label="finished">
          <JobProgress
            {...JOB}
            stageIndex={STAGES.length}
            stageProgress={1}
            eta="seconds"
            elapsedMs={72_000}
          />
        </State>
        <State label="success">
          <JobProgress
            {...JOB}
            stageIndex={STAGES.length}
            stageProgress={1}
            eta="seconds"
            outcome={{ status: "success", summary: "All 412 tests passed." }}
            elapsedMs={184_000}
          />
        </State>
        <State label="partial">
          <JobProgress
            {...JOB}
            stageIndex={STAGES.length}
            stageProgress={1}
            eta="seconds"
            outcome={{
              status: "partial",
              summary:
                "Build passed. Tests stopped after the preview timed out.",
            }}
            elapsedMs={72_000}
          />
        </State>
        <State label="failed">
          <JobProgress
            {...JOB}
            stageIndex={2}
            stageProgress={0.3}
            eta="about 2 min"
            outcome={{
              status: "failed",
              summary: "tsc exited with code 2 in packages/react.",
            }}
            elapsedMs={95_000}
          />
        </State>
        <State label="cancelled">
          <JobProgress
            {...JOB}
            stageIndex={1}
            stageProgress={0.4}
            eta="about 4 min"
            outcome={{
              status: "cancelled",
              summary: "Cancelled during install.",
            }}
            elapsedMs={21_000}
          />
        </State>
      </States>
    ),
  },
]);
