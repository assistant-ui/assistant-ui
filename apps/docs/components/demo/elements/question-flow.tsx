"use client";

import { useEffect, useState } from "react";
import {
  QuestionFlow,
  type QuestionFlowStep,
} from "@/components/assistant-ui/elements/question-flow";

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

export function QuestionFlowDemo() {
  const [choice, setChoice] = useState<Record<string, string[]> | undefined>(
    undefined,
  );

  useEffect(() => {
    if (choice === undefined) return;
    const id = setTimeout(() => setChoice(undefined), 2600);
    return () => clearTimeout(id);
  }, [choice]);

  return (
    <QuestionFlow
      key={choice === undefined ? "open" : "receipt"}
      steps={STEPS}
      choice={choice}
      onComplete={(answers) =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            setChoice(answers);
            resolve();
          }, 700);
        })
      }
    />
  );
}
