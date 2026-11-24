"use client";

import { Copy01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { copyWithToast } from "./item-menu";
import { LibraryPage } from "./library-page";

function CopyLine({
  label,
  value,
  copied,
  copyLabel,
}: {
  label: string;
  value: string;
  copied: string;
  copyLabel: string;
}) {
  return (
    <div className="border-border/60 flex flex-col gap-3 rounded-xl border px-3.5 py-3 @lg:flex-row @lg:items-center">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-muted-foreground text-xs">{label}</span>
        <code className="font-mono text-sm [overflow-wrap:anywhere]">
          {value}
        </code>
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="shrink-0 self-start @lg:self-center"
        aria-label={copyLabel}
        onClick={() => copyWithToast(value, copied)}
      >
        <HugeiconsIcon icon={Copy01Icon} strokeWidth={1.5} aria-hidden />
        Copy
      </Button>
    </div>
  );
}

export function SetupPage({
  prompt,
  command,
  description,
}: {
  prompt: string;
  command: string;
  description: string;
}) {
  return (
    <LibraryPage title="Setup" search={false} description={description}>
      <div className="@container flex flex-col gap-3">
        <CopyLine
          label="Ask your coding agent"
          value={prompt}
          copied="Prompt copied."
          copyLabel="Copy the setup prompt"
        />
        <CopyLine
          label="The agent runs"
          value={command}
          copied="Command copied."
          copyLabel="Copy the setup command"
        />
      </div>
      <p className="text-muted-foreground max-w-prose text-sm leading-5">
        The command guides the install and opens your browser when it needs your
        input. You pick a runtime, a backend, and the components you want, and
        the agent installs them and wires them into your project.
      </p>
    </LibraryPage>
  );
}
