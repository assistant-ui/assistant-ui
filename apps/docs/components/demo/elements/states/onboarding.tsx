"use client";

import {
  Onboarding,
  type OnboardingStep,
} from "@/components/assistant-ui/elements/onboarding";
import { defineStates } from "./types";

const noop = () => {};

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

export const states = defineStates([
  { key: "default", label: "Default" },
  {
    key: "middle-step",
    label: "Middle step",
    note: "Partway through the tour, with the dots showing progress.",
    Component: () => (
      <Onboarding steps={STEPS} index={1} onNext={noop} onSkip={noop} />
    ),
  },
  {
    key: "last-step",
    label: "Last step",
    note: "On the final step the next button becomes Start.",
    Component: () => (
      <Onboarding steps={STEPS} index={2} onNext={noop} onSkip={noop} />
    ),
  },
  {
    key: "single-step",
    label: "Single step",
    note: "A one-step tour opens straight on Start.",
    Component: () => (
      <Onboarding
        steps={STEPS.slice(0, 1)}
        index={0}
        onNext={noop}
        onSkip={noop}
      />
    ),
  },
  {
    key: "long-content",
    label: "Long step",
    note: "A long body and example wrap inside the card.",
    Component: () => (
      <Onboarding
        steps={[
          {
            title: "Connect your tools before your first question",
            body: "Add the MCP servers your team already uses, such as Linear, GitHub and your internal docs search, so answers can cite real tickets and pull requests instead of guessing. You can change these later in settings, and nothing is called until you approve the first request.",
            example:
              "Find the Linear ticket for the draft restore bug, link the PR that fixed it, and tell me whether the regression test covers remote threads.",
          },
          ...STEPS.slice(1),
        ]}
        index={0}
        onNext={noop}
        onSkip={noop}
      />
    ),
  },
]);
