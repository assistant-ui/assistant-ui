import { useState } from "react";
import {
  Onboarding,
  type OnboardingStep,
} from "@assistant-ui/ui/components/assistant-ui/elements/onboarding.tsx";
import { defineSections } from "../types";

const STEPS: readonly OnboardingStep[] = [
  {
    title: "Ask about your own code",
    body: "It reads the repo you point it at, so questions can be specific rather than general.",
    example: "Why does the composer re-render on every keystroke?",
  },
  {
    title: "Let it do the work",
    body: "It can edit files and run your test command, and it shows you the diff before anything lands.",
    example: "Fix the failing converter test and add a regression case.",
  },
  {
    title: "Keep it honest",
    body: "Every tool call is visible, and anything with side effects waits for you to approve it.",
    example: "Run the full suite and summarize what broke.",
  },
];

function OnboardingExample() {
  const [index, setIndex] = useState(1);
  return (
    <Onboarding
      steps={STEPS}
      index={index}
      onNext={() => setIndex((current) => (current + 1) % STEPS.length)}
      onSkip={() => setIndex(0)}
    />
  );
}

export default defineSections([
  {
    id: "onboarding",
    title: "Onboarding",
    category: "chat",
    notes: "onboarding.tsx (standalone): step 2 of 3.",
    render: () => <OnboardingExample />,
  },
]);
