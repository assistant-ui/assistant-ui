"use client";

import { useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";
import ShikiHighlighter from "react-shiki";
import { cn } from "@/lib/utils";
import { useFlavor } from "@/components/docs/contexts/flavor";

type Tab = "preview" | "code";

type PreviewCodeClientProps = {
  code: string;
  baseCode?: string;
  children: React.ReactNode;
  base?: React.ReactNode;
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
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "rounded-md px-2.5 py-1 text-xs transition-colors",
        isActive
          ? "bg-muted text-foreground font-medium"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function PreviewCodeClient({
  code,
  baseCode,
  children,
  base,
  className,
}: PreviewCodeClientProps) {
  const [tab, setTab] = useState<Tab>("preview");
  const [copied, setCopied] = useState(false);
  const flavor = useFlavor();

  const activeCode =
    flavor === "base" && baseCode !== undefined ? baseCode : code;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(activeCode);
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
            "preview-code-preview border-border/50 flex items-center justify-center rounded-xl border p-6",
            className,
          )}
        >
          <div className="w-full">
            {flavor === "base" && base !== undefined ? base : children}
          </div>
        </div>
      ) : (
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
          <div className="max-h-96 scrollbar-none overflow-auto py-3.5 text-[0.8125rem] leading-[1.65]">
            <ShikiHighlighter
              language="tsx"
              theme={{ dark: "catppuccin-mocha", light: "catppuccin-latte" }}
              addDefaultStyles={false}
              showLanguage={false}
            >
              {activeCode.trim()}
            </ShikiHighlighter>
          </div>
        </div>
      )}
    </div>
  );
}
