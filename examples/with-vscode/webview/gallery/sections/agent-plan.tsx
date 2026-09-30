import { AgentPlan } from "@assistant-ui/ui/components/assistant-ui/elements/agent-plan.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const STEPS = [
  {
    id: "read",
    label: "Read existing composer state",
    description: "Trace the current data flow before changing it.",
  },
  {
    id: "design",
    label: "Design the draft store",
    description: "Keep pending changes local until they are ready.",
  },
  { id: "wire", label: "Wire runtime persistence" },
  { id: "test", label: "Add regression tests" },
  { id: "docs", label: "Update the docs" },
] as const;

export default defineSections([
  {
    id: "agent-plan",
    title: "Agent plan",
    category: "agents",
    notes:
      "The first step active, a step in the middle, and every step done. The fixture plan data part uses the same component.",
    render: () => (
      <States>
        <State label="starting">
          <AgentPlan title="Composer draft" steps={STEPS} activeIndex={0} />
        </State>
        <State label="step 3 of 5">
          <AgentPlan title="Composer draft" steps={STEPS} activeIndex={2} />
        </State>
        <State label="done">
          <AgentPlan
            title="Composer draft"
            steps={STEPS}
            activeIndex={STEPS.length}
          />
        </State>
      </States>
    ),
  },
]);
