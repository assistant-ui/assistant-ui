"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import ShikiHighlighter from "react-shiki";
import { cn } from "@/lib/utils";

type Tab = "preview" | "code";

type PreviewCodeClientProps = {
  code: string;
  children: React.ReactNode;
  className?: string;
};

type TabButtonProps = {
  label: string;
  value: Tab;
  currentTab: Tab;
  onSelect: (tab: Tab) => void;
};

function TabButton({ label, value, currentTab, onSelect }: TabButtonProps) {
  const isActive = currentTab === value;
  return (
    <button
      onClick={() => onSelect(value)}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition-colors",
        isActive
          ? "bg-muted font-medium text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function PreviewCodeClient({
  code,
  children,
  className,
}: PreviewCodeClientProps) {
  const [tab, setTab] = useState<Tab>("preview");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="not-prose my-4">
      <div className="flex justify-end gap-1 pb-2">
        <TabButton
          label="Preview"
          value="preview"
          currentTab={tab}
          onSelect={setTab}
        />
        <TabButton
          label="Code"
          value="code"
          currentTab={tab}
          onSelect={setTab}
        />
      </div>

      {tab === "preview" ? (
        <div
          className={cn(
            "preview-code-preview flex items-center justify-center rounded-xl border border-border/50 p-6",
            className,
          )}
        >
          <div className="w-full">{children}</div>
        </div>
      ) : (
        <div className="preview-code-block relative overflow-hidden rounded-xl">
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
          <div className="scrollbar-none max-h-96 overflow-auto py-3.5 text-[0.8125rem] leading-[1.65]">
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
