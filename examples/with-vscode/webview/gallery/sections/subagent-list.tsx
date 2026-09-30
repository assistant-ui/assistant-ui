import {
  SubagentList,
  type SubagentItem,
} from "@assistant-ui/ui/components/assistant-ui/elements/subagent-list.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const AGENTS: readonly SubagentItem[] = [
  { name: "Explore the runtime", model: "haiku" },
  { name: "Fix composer types", model: "sonnet" },
  { name: "Write regression tests for the draft store", model: "sonnet" },
];

const SUMMARY: SubagentItem = { name: "Summarize findings", model: "haiku" };

export default defineSections([
  {
    id: "subagent-list",
    title: "Subagent list",
    category: "agents",
    notes: "All running, one done, and all done with the summary agent.",
    render: () => (
      <States>
        <State label="running">
          <SubagentList
            agents={AGENTS}
            completedCount={0}
            progress={[68, 44, 22]}
            showSummary={false}
            summaryAgent={SUMMARY}
          />
        </State>
        <State label="1 of 3 done">
          <SubagentList
            agents={AGENTS}
            completedCount={1}
            progress={[100, 68, 44]}
            showSummary={false}
            summaryAgent={SUMMARY}
          />
        </State>
        <State label="done, summarizing">
          <SubagentList
            agents={AGENTS}
            completedCount={3}
            progress={[100, 100, 100]}
            showSummary
            summaryAgent={SUMMARY}
          />
        </State>
      </States>
    ),
  },
]);
