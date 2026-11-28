"use client";

import type { ReactNode } from "react";
import { LibraryCopyButton } from "./library-copy-button";

const SHELL_TOKEN = /(\s+|&&|\|\||[|;]|"[^"]*"|'[^']*'|`[^`]*`|[^\s|;&]+)/g;

// The colors the site's code blocks use, which a library code theme re-points.
const SHELL_TONE = {
  command: "text-(--ch-5)",
  flag: "text-(--ch-2)",
  operator: "text-(--ch-7)",
  argument: "text-(--ch-8)",
};

/** A shell command as colored spans: each command's name, its flags, the operators between commands, and the rest. */
function highlightShell(command: string): ReactNode[] {
  let startsCommand = true;
  return (command.match(SHELL_TOKEN) ?? []).map((token, index) => {
    if (/^\s+$/.test(token)) return token;
    let tone = SHELL_TONE.argument;
    if (/^(&&|\|\||[|;])$/.test(token)) {
      tone = SHELL_TONE.operator;
      startsCommand = true;
    } else if (startsCommand) {
      tone = SHELL_TONE.command;
      startsCommand = false;
    } else if (token.startsWith("-")) {
      tone = SHELL_TONE.flag;
    }
    return (
      <span key={index} className={tone}>
        {token}
      </span>
    );
  });
}

/** A command on a tinted line, highlighted, with a copy button. */
export function CommandLine({ command }: { command: string }) {
  return (
    <div className="bg-foreground/[0.025] dark:bg-foreground/[0.04] flex items-center gap-2 rounded-xl py-1 ps-3 pe-1">
      <code className="min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap [font-variant-ligatures:none]">
        {highlightShell(command)}
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
