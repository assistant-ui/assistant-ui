import {
  BackgroundInbox,
  type BackgroundRun,
} from "@assistant-ui/ui/components/assistant-ui/elements/background-inbox.tsx";
import { defineSections } from "../types";
import { State, States, noop } from "./_states";

const RUNS: readonly BackgroundRun[] = [
  {
    id: "1",
    title: "Audit the adapters for parity gaps",
    state: "ready",
    elapsed: "4m",
    summary: "6 gaps found",
  },
  {
    id: "2",
    title: "Regenerate the API reference",
    state: "running",
    elapsed: "1m",
  },
  {
    id: "3",
    title: "Bump dependencies across every example and template",
    state: "failed",
    elapsed: "2m",
    summary: "lockfile conflict in examples/with-vscode",
  },
];

export default defineSections([
  {
    id: "background-inbox",
    title: "Background inbox",
    category: "agents",
    notes: "Ready, running and failed runs; a ready run can be collected.",
    render: () => (
      <States>
        <State label="mixed">
          <BackgroundInbox runs={RUNS} onCollect={noop} />
        </State>
        <State label="all running, read-only">
          <BackgroundInbox
            runs={RUNS.map((run) => ({
              id: run.id,
              title: run.title,
              state: "running",
              elapsed: run.elapsed,
            }))}
          />
        </State>
        <State label="empty">
          <BackgroundInbox runs={[]} />
        </State>
      </States>
    ),
  },
]);
