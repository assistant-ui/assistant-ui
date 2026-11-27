"use client";

import type { ReactNode } from "react";
import { LibraryCopyButton } from "./library-copy-button";

/** A command on a tinted line, with a copy button. */
export function CommandLine({ command }: { command: string }) {
  return (
    <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] flex items-center gap-2 rounded-xl py-1 ps-3 pe-1">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap [font-variant-ligatures:none]">
        {command}
      </code>
      <LibraryCopyButton text={command} label="Copy command" />
    </div>
  );
}

/** One numbered step; steps in a list are joined by a line. */
export function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <li className="group/step relative flex gap-3 pb-6 last:pb-0">
      <span
        aria-hidden
        className="bg-foreground/25 absolute top-6 bottom-0 left-[11.5px] w-px group-last/step:hidden"
      />
      <span className="bg-foreground/[0.06] ring-background relative grid size-6 shrink-0 place-items-center rounded-full text-xs tabular-nums ring-4">
        {number}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        {children}
      </div>
    </li>
  );
}
