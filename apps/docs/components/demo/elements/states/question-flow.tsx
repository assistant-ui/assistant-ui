"use client";

import {
  QuestionFlow,
  type QuestionFlowStep,
} from "@/components/assistant-ui/elements/question-flow";
import { defineStates } from "./types";

const noop = () => {};

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

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "prefilled",
    label: "Prefilled",
    note: "The first question opens with a suggested answer already marked.",
    Component: () => (
      <QuestionFlow
        steps={STEPS}
        defaultValue={{ audience: ["leads"], topics: ["milestones", "risks"] }}
        onComplete={noop}
      />
    ),
  },
  {
    key: "multiple-step",
    label: "Multiple pick",
    note: "A single-question flow that takes several answers and submits them.",
    Component: () => (
      <QuestionFlow
        steps={[STEPS[1]!]}
        defaultValue={{ topics: ["milestones"] }}
        completeLabel="Send update"
        onComplete={noop}
      />
    ),
  },
  {
    key: "success",
    label: "Answered",
    note: "Every answer stays as a read-only receipt.",
    Component: () => (
      <QuestionFlow
        steps={STEPS}
        choice={{
          audience: ["leads"],
          topics: ["milestones", "risks"],
          timing: ["monday"],
        }}
      />
    ),
  },
  {
    key: "partial-receipt",
    label: "Partial answers",
    note: "A receipt leaves out a question that got no answer.",
    Component: () => (
      <QuestionFlow
        steps={STEPS}
        choice={{ audience: ["team"], topics: [], timing: ["today"] }}
      />
    ),
  },
  {
    key: "read-only",
    label: "Read only",
    note: "Without a complete handler every question is listed at once for display.",
    Component: () => <QuestionFlow steps={STEPS} />,
  },
  {
    key: "long-content",
    label: "Long question",
    note: "A long question, description, and options wrap inside the card.",
    Component: () => (
      <QuestionFlow
        steps={[
          {
            id: "retention",
            question:
              "How long should archived conversations and their generated files be kept before they are deleted for good?",
            description:
              "This applies to every workspace member, including conversations shared through public links.",
            options: [
              {
                id: "30",
                label: "30 days",
                description: "Matches the default for new workspaces.",
              },
              {
                id: "365",
                label: "One year, then delete the files but keep the text",
              },
              {
                id: "forever",
                label: "Keep everything until an admin deletes it",
              },
            ],
          },
          STEPS[2]!,
        ]}
        onComplete={noop}
      />
    ),
  },
]);
