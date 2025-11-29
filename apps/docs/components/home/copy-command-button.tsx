"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";

export function CopyCommandButton() {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText("npx assistant-ui init");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copyToClipboard}
      className="group flex h-10 items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-4 font-mono text-sm transition-all hover:border-border hover:bg-muted/50"
    >
      <span className="text-muted-foreground/70">$</span>
      <span>npx assistant-ui init</span>
      <div className="ml-1 flex size-4 items-center justify-center text-muted-foreground">
        {copied ? (
          <CheckIcon className="size-3.5 text-green-500" />
        ) : (
          <CopyIcon className="size-3.5 opacity-50 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </button>
  );
}

