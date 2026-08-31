"use client";

import type { ToolCallMessagePartComponent } from "@assistant-ui/react";

export const ToolFallback: ToolCallMessagePartComponent = ({
  toolName,
  args,
  result,
  status,
}) => (
  <div className="my-3 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 text-sm">
    <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
      <code className="font-semibold">{toolName}</code>
      <span className="text-xs text-[var(--muted-foreground)]">
        {status.type}
      </span>
    </div>
    <details className="px-4 py-3">
      <summary className="cursor-pointer text-[var(--muted-foreground)]">
        Inspect structured call
      </summary>
      <pre className="mt-3 overflow-x-auto text-xs leading-5">
        {JSON.stringify({ args, result }, null, 2)}
      </pre>
    </details>
  </div>
);
