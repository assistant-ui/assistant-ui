import { AgentHandoff } from "@assistant-ui/ui/components/assistant-ui/elements/agent-handoff.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const HANDOFF = {
  from: "Triage",
  to: "Maintainer",
  reason:
    "Triage reproduced the report and narrowed it to the converter, so the fix goes to the agent that can write and verify a patch.",
  carried: [
    "The failing test and its output",
    "The two files the reader already narrowed to",
  ],
};

export default defineSections([
  {
    id: "agent-handoff",
    title: "Agent handoff",
    category: "agents",
    notes: "Handing over (unsettled) and settled.",
    render: () => (
      <States>
        <State label="handing over">
          <AgentHandoff {...HANDOFF} settled={false} />
        </State>
        <State label="settled">
          <AgentHandoff {...HANDOFF} settled />
        </State>
      </States>
    ),
  },
]);
