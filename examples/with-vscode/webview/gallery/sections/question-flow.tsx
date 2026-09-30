import { useState } from "react";
import {
  QuestionFlow,
  type QuestionFlowStep,
} from "@assistant-ui/ui/components/assistant-ui/elements/question-flow.tsx";
import { defineSections } from "../types";
import { State, States } from "./_states";

const STEPS: readonly QuestionFlowStep[] = [
  {
    id: "audience",
    question: "Who should receive the project update?",
    options: [
      { id: "team", label: "The project team" },
      { id: "leads", label: "Department leads" },
      { id: "company", label: "The whole company" },
    ],
  },
  {
    id: "topics",
    question: "What should the update cover?",
    description: "Choose everything that belongs in this update.",
    selectionMode: "multiple",
    minSelections: 1,
    options: [
      { id: "milestones", label: "Milestones" },
      { id: "risks", label: "Open risks" },
      { id: "next", label: "What happens next" },
    ],
  },
  {
    id: "timing",
    question: "When should it be sent?",
    options: [
      { id: "today", label: "Today" },
      { id: "monday", label: "Monday morning" },
      { id: "review", label: "After a review" },
    ],
  },
];

function InteractiveFlow() {
  const [choice, setChoice] = useState<Record<string, string[]> | undefined>(
    undefined,
  );
  return (
    <QuestionFlow
      key={choice === undefined ? "open" : "receipt"}
      steps={STEPS}
      choice={choice}
      onComplete={setChoice}
    />
  );
}

export default defineSections([
  {
    id: "question-flow",
    title: "Question flow",
    category: "agents",
    notes:
      "Three questions, the second multiple choice; completing turns it into a receipt.",
    render: () => <InteractiveFlow />,
  },
  {
    id: "question-flow-states",
    title: "Question flow states",
    category: "agents",
    notes:
      "Prefilled answers for the first two steps, and the completed receipt.",
    render: () => (
      <States>
        <State label="prefilled">
          <QuestionFlow
            steps={STEPS}
            defaultValue={{ audience: ["leads"], topics: ["risks"] }}
            onComplete={() => {}}
          />
        </State>
        <State label="receipt">
          <QuestionFlow
            steps={STEPS}
            choice={{
              audience: ["team"],
              topics: ["milestones", "next"],
              timing: ["monday"],
            }}
          />
        </State>
      </States>
    ),
  },
]);
