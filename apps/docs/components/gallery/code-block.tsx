"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import ShikiHighlighter from "react-shiki";

export function CodeBlock({
  code,
  language = "tsx",
}: {
  code: string;
  language?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="preview-code-block relative overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={handleCopy}
        className="text-muted-foreground hover:bg-background hover:text-foreground absolute top-2 right-2 z-10 flex size-7 items-center justify-center rounded-md opacity-50 transition-all hover:opacity-100"
        aria-label={copied ? "Copied" : "Copy code"}
      >
        {copied ? (
          <CheckIcon className="size-3.5" />
        ) : (
          <CopyIcon className="size-3.5" />
        )}
      </button>
      <div className="max-h-[28rem] scrollbar-none overflow-auto py-3.5 text-[0.8125rem] leading-[1.65]">
        <ShikiHighlighter
          language={language}
          theme={{ dark: "catppuccin-mocha", light: "catppuccin-latte" }}
          addDefaultStyles={false}
          showLanguage={false}
        >
          {code.trim()}
        </ShikiHighlighter>
      </div>
    </div>
  );
}
