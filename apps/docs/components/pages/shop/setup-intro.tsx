"use client";

import { useWizardNext } from "@/components/pages/shop/wizard-actions";

const STEPS = [
  {
    title: "Connect your agent",
    detail: "Paste one prompt into Claude Code, Cursor, or the agent you use.",
  },
  {
    title: "Your agent explores your codebase",
    detail:
      "It reads your project and each product’s setup instructions, then asks what the code does not decide.",
  },
  {
    title: "You approve the plan",
    detail:
      "It proposes the selected products and any related integrations it finds. Changes begin after you approve.",
  },
  {
    title: "Your agent implements it",
    detail: "You follow each step here and try the result when it finishes.",
  },
];

export function SetupIntro({ onContinue }: { onContinue: () => void }) {
  useWizardNext({ label: "Next", onClick: onContinue });
  return (
    <ol
      role="list"
      aria-label="How setup works"
      className="my-auto flex flex-col"
    >
      {STEPS.map((step, index) => (
        <li key={step.title} className="group flex gap-4">
          <span className="text-muted-foreground w-4 shrink-0 text-sm leading-7 tabular-nums">
            {index + 1}
          </span>
          <div className="pb-6 group-last:pb-0">
            <p className="text-sm leading-7 font-medium">{step.title}</p>
            <p className="text-muted-foreground text-sm">{step.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
