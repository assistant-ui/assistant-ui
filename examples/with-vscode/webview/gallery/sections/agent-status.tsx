import { ChevronDownIcon } from "lucide-react";
import { AgentStatus } from "@assistant-ui/ui/components/assistant-ui/elements/agent-status.tsx";
import {
  AgentStatus as RuntimeAgentStatus,
  TaskTray,
} from "@assistant-ui/ui/components/assistant-ui/elements/agent-status.aui.tsx";
import { defineSections } from "../types";
import { SeededRuntime } from "../runtime";
import { State, States } from "./_states";
import { taskMessages } from "./_tasks";

export default defineSections([
  {
    id: "agent-status",
    title: "Agent status",
    category: "agents",
    notes:
      "Working, waiting, done and failed, with elapsed time and a trailing slot.",
    render: () => (
      <States>
        <State label="working">
          <div className="flex">
            <AgentStatus
              state="working"
              label="Refactoring composer"
              elapsed="0:42"
            />
          </div>
        </State>
        <State label="waiting">
          <div className="flex">
            <AgentStatus
              state="waiting"
              label="Waiting for approval"
              elapsed="1:05"
            />
          </div>
        </State>
        <State label="done">
          <div className="flex">
            <AgentStatus
              state="done"
              label="Finished, 2 files changed"
              elapsed="2:31"
            />
          </div>
        </State>
        <State label="failed">
          <div className="flex">
            <AgentStatus
              state="failed"
              label="Tests failed in packages/react"
              elapsed="3:12"
            />
          </div>
        </State>
        <State label="trailing, long label">
          <div className="flex">
            <AgentStatus
              state="working"
              label="Regenerating the API reference for every published package"
              elapsed="12:48"
              trailing={<ChevronDownIcon className="size-3" />}
            />
          </div>
        </State>
      </States>
    ),
  },
  {
    id: "agent-status-aui",
    title: "Agent status (runtime tasks)",
    category: "agents",
    notes:
      "agent-status.aui.tsx summarizes the thread's delegated tasks (one done, one failed, one open): running, then waiting. TaskTray opens the task list.",
    render: () => (
      <States>
        <State label="running">
          <SeededRuntime messages={taskMessages("running")}>
            <div className="flex flex-wrap items-center gap-3">
              <RuntimeAgentStatus />
              <TaskTray />
            </div>
          </SeededRuntime>
        </State>
        <State label="waiting">
          <SeededRuntime messages={taskMessages("requires-action")}>
            <div className="flex flex-wrap items-center gap-3">
              <RuntimeAgentStatus />
              <TaskTray />
            </div>
          </SeededRuntime>
        </State>
      </States>
    ),
  },
]);
