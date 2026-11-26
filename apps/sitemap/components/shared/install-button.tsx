"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

/** A hero's install command: a bordered ghost button that copies the command. */
export function InstallButton({ command }: { command: string }) {
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });

  return (
    <Button
      size="lg"
      variant="ghost"
      onClick={() => copyToClipboard(command)}
      aria-label={`Copy install command: ${command}`}
      className="border-border h-auto min-h-9 max-w-full justify-start py-1.5 text-start font-mono font-normal whitespace-normal [font-variant-ligatures:none]"
    >
      <span className="[overflow-wrap:anywhere]">{command}</span>
      {isCopied ? (
        <CheckIcon aria-hidden data-icon="inline-end" />
      ) : (
        <CopyIcon
          aria-hidden
          data-icon="inline-end"
          className="text-muted-foreground"
        />
      )}
      <span role="status" className="sr-only">
        {isCopied ? "Copied" : ""}
      </span>
    </Button>
  );
}
