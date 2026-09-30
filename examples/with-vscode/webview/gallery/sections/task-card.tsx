import { useState } from "react";
import { TaskCard } from "@assistant-ui/ui/components/assistant-ui/elements/task-card.tsx";
import { TaskGroup } from "@assistant-ui/ui/components/assistant-ui/elements/task-card.aui.tsx";
import { Thread } from "@assistant-ui/ui/components/assistant-ui/elements/thread.aui.tsx";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";
import { State, States, noop } from "./_states";
import { taskMessages } from "./_tasks";

function InteractiveTaskCard() {
  const [open, setOpen] = useState(true);
  return (
    <TaskCard
      label="Review the runtime"
      meta="research"
      state="done"
      elapsed="42s"
      result="Found the relevant runtime path."
      open={open}
      onOpenChange={setOpen}
    >
      <p>Read the runtime entry point.</p>
      <p>Checked the thread lifecycle.</p>
      <p>Prepared the findings.</p>
    </TaskCard>
  );
}

function TaskThread({ status }: { status: "running" | "requires-action" }) {
  return (
    <SeededRuntime messages={taskMessages(status)}>
      <div className="h-120">
        <Thread components={{ TaskGroup }} />
      </div>
    </SeededRuntime>
  );
}

export default defineSections([
  {
    id: "task-card",
    title: "Task card",
    category: "agents",
    notes: "A finished task, open on its transcript; the header toggles.",
    render: () => <InteractiveTaskCard />,
  },
  {
    id: "task-card-states",
    title: "Task card states",
    category: "agents",
    notes:
      "Working, waiting with actions, failed, cancelled, and a long label.",
    render: () => (
      <States>
        <State label="working">
          <TaskCard
            label="Fix composer types"
            meta="coder"
            state="working"
            elapsed="12s"
          />
        </State>
        <State label="waiting, with actions">
          <TaskCard
            label="Push the branch"
            meta="release"
            state="waiting"
            elapsed="1m 4s"
            actions={
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  className="bg-foreground text-background rounded-full px-3 py-1"
                  onClick={noop}
                >
                  Allow
                </button>
                <button
                  type="button"
                  className="rounded-full px-3 py-1"
                  onClick={noop}
                >
                  Deny
                </button>
              </div>
            }
          />
        </State>
        <State label="failed">
          <TaskCard
            label="Run the suite"
            meta="tester"
            state="failed"
            elapsed="2m 10s"
            result="3 tests failed in packages/react."
          />
        </State>
        <State label="cancelled">
          <TaskCard label="Bump dependencies" state="cancelled" elapsed="8s" />
        </State>
        <State label="long label and meta">
          <TaskCard
            label="Regenerate the API reference for every published package and open a PR"
            meta="documentation-writer-with-a-long-name"
            state="done"
            elapsed="12m 48s"
            result="142 pages written."
          />
        </State>
      </States>
    ),
  },
  {
    id: "task-card-aui",
    title: "Task lanes in a thread",
    category: "agents",
    notes:
      "Thread with components.TaskGroup: three delegations with nested transcripts (done, failed, running) render as task lanes.",
    render: () => <TaskThread status="running" />,
  },
  {
    id: "task-card-aui-waiting",
    title: "Task lanes waiting",
    category: "agents",
    notes: "The same delegations while the open one waits on the user.",
    render: () => <TaskThread status="requires-action" />,
  },
]);
