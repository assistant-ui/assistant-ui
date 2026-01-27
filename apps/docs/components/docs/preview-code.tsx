"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import ShikiHighlighter from "react-shiki";
import { cn } from "@/lib/utils";

type PreviewCodeClientProps = {
  code: string;
  children: React.ReactNode;
  className?: string;
};

export function PreviewCodeClient({
  code,
  children,
  className,
}: PreviewCodeClientProps) {
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="not-prose my-4">
      <div className="flex justify-end gap-1 pb-2">
        <button
          onClick={() => setTab("preview")}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs transition-colors",
            tab === "preview"
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          Preview
        </button>
        <button
          onClick={() => setTab("code")}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs transition-colors",
            tab === "code"
              ? "bg-muted font-medium text-foreground"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
          )}
        >
          Code
        </button>
      </div>

      {tab === "preview" ? (
        <div
          className={cn(
            "flex items-center justify-center rounded-xl border border-border/50 p-6",
            className,
          )}
        >
          {children}
        </div>
      ) : (
        <div className="preview-code-block relative overflow-hidden rounded-xl border border-border/50 bg-muted">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-50 transition-all hover:bg-background hover:text-foreground hover:opacity-100"
            aria-label={copied ? "Copied" : "Copy code"}
          >
            {copied ? (
              <CheckIcon className="size-3.5" />
            ) : (
              <CopyIcon className="size-3.5" />
            )}
          </button>
          <div className="max-h-96 overflow-auto py-3.5 text-[0.8125rem] leading-[1.65]">
            <ShikiHighlighter
              language="tsx"
              theme={{ dark: "catppuccin-mocha", light: "catppuccin-latte" }}
              addDefaultStyles={false}
              showLanguage={false}
            >
              {code.trim()}
            </ShikiHighlighter>
          </div>
        </div>
      )}
    </div>
  );
}
