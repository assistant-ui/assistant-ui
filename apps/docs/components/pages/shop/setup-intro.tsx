"use client";

import { useWizardNext } from "@/components/pages/shop/wizard-actions";

const STEPS = [
  {
    title: "Connect your agent",
    detail: "Paste one prompt into Claude Code, Cursor, or the agent you use.",
  },
  {
    title: "Your agent explores your codebase",
    detail: "It reads the project and asks you what the code does not decide.",
  },
  {
    title: "You approve the plan",
    detail:
      "Nothing is changed until you approve, and you can ask for changes.",
  },
  {
    title: "Your agent implements it",
    detail: "You follow each step here and try the result when it finishes.",
  },
];

export function SetupIntro({ onContinue }: { onContinue: () => void }) {
  useWizardNext({ label: "Next", onClick: onContinue });
  return (
    <ol role="list" aria-label="How setup works" className="flex flex-col">
      {STEPS.map((step, index) => (
        <li key={step.title} className="group flex gap-4">
          <div className="flex flex-col items-center">
            <span className="bg-foreground/[0.06] flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-medium tabular-nums">
              {index + 1}
            </span>
            {index < STEPS.length - 1 ? (
              <span aria-hidden className="bg-foreground/10 w-px flex-1" />
            ) : null}
          </div>
          <div className="pb-4 group-last:pb-0">
            <p className="text-base leading-7 font-medium sm:text-sm sm:leading-7">
              {step.title}
            </p>
            <p className="text-muted-foreground text-sm">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
