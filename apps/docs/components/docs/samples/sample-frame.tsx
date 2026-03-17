"use client";

import { useState } from "react";
import { CheckIcon, CodeIcon, CopyIcon, XIcon } from "lucide-react";
import ShikiHighlighter from "react-shiki";
import { cn } from "@/lib/utils";

type SampleFrameProps = {
  code?: string;
  children: React.ReactNode;
  className?: string;
};

export function SampleFrame({ code, children, className }: SampleFrameProps) {
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);

  const ToggleIcon = showCode ? XIcon : CodeIcon;
  const buttonLabel = showCode ? "Hide Code" : "View Code";

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="not-prose my-6">
      {code && (
        <div className="flex justify-end gap-2 px-1 pb-2">
          {showCode && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
            >
              {copied ? (
                <>
                  <CheckIcon className="size-3.5" />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5" />
                  Copy
                </>
              )}
            </button>
          )}
          <button
            onClick={() => setShowCode(!showCode)}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-muted-foreground text-xs transition-colors hover:bg-muted hover:text-foreground"
          >
            <ToggleIcon className="size-3.5" />
            {buttonLabel}
          </button>
        </div>
      )}

      <div
        className={cn(
          "relative h-150 rounded-xl border border-border/50",
          className,
        )}
      >
        {children}
      </div>

      {showCode && code && (
        <div className="mt-3 overflow-hidden rounded-xl bg-zinc-950 text-sm [&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:p-4!">
          <ShikiHighlighter
            language="tsx"
            theme={{ dark: "vitesse-dark", light: "vitesse-dark" }}
            addDefaultStyles={false}
            showLanguage={false}
          >
            {code.trim()}
          </ShikiHighlighter>
        </div>
      )}
    </div>
  );
}
