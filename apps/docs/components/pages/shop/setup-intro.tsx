"use client";

import { Button } from "@/components/ui/button";
import {
  ArrowRightIcon,
  Code2Icon,
  FileCheckIcon,
  TerminalIcon,
} from "lucide-react";

const STEPS = [
  {
    title: "Connect your agent",
    detail:
      "Paste the setup prompt into your coding agent. It explores your project and asks what it needs.",
    icon: TerminalIcon,
  },
  {
    title: "Review the plan",
    detail:
      "Check the proposed changes and ask for adjustments before you approve.",
    icon: FileCheckIcon,
  },
  {
    title: "Follow the build",
    detail:
      "Track progress, answer questions, and try the result here when it’s ready.",
    icon: Code2Icon,
  },
];

export function SetupIntro({ onContinue }: { onContinue: () => void }) {
  return (
    <section
      aria-labelledby="setup-intro-heading"
      className="flex min-h-0 flex-1 overflow-y-auto"
    >
      <div className="m-auto flex w-full max-w-2xl flex-col gap-6 px-5 py-8 sm:px-8">
        <div className="flex flex-col gap-2">
          <h2
            id="setup-intro-heading"
            className="font-display text-2xl leading-tight font-medium tracking-tight"
          >
            Set up in your own project
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your coding agent does the work. You stay in control.
          </p>
        </div>
        <ol
          role="list"
          className="border-foreground/10 divide-foreground/10 grid divide-y border-y sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {STEPS.map(({ title, detail, icon: Icon }) => (
            <li
              key={title}
              className="flex gap-3 py-4 sm:flex-col sm:px-4 sm:py-5 sm:first:pl-0 sm:last:pr-0"
            >
              <Icon
                aria-hidden
                className="text-muted-foreground mt-0.5 size-4 shrink-0"
              />
              <div className="min-w-0">
                <h3 className="text-sm font-medium">{title}</h3>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {detail}
                </p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button onClick={onContinue} autoFocus>
            Connect agent
            <ArrowRightIcon aria-hidden data-icon="inline-end" />
          </Button>
          <p className="text-muted-foreground text-xs">
            No files change until you approve.
          </p>
        </div>
      </div>
    </section>
  );
}
