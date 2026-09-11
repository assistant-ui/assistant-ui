"use client";

import { useState } from "react";
import ShikiHighlighter from "react-shiki";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";
import { useFlavor } from "@/components/pages/docs/contexts/flavor";
import { analytics } from "@/lib/analytics";

type Tab = "preview" | "code";

type PreviewCodeClientProps = {
  code: string;
  codeVariant: "base" | "radix";
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
        "after:bg-foreground relative pb-1 text-xs font-medium transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:opacity-0 after:transition-opacity",
        isActive
          ? "text-foreground after:opacity-100"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

export function PreviewCodeClient({
  code,
  codeVariant,
  baseCode,
  children,
  base,
  className,
}: PreviewCodeClientProps) {
  const [tab, setTab] = useState<Tab>("preview");
  const flavor = useFlavor();

  const copiedBaseSource = flavor === "base" && baseCode !== undefined;
  const activeCode = copiedBaseSource ? baseCode : code;

  return (
    <div className="not-prose my-4">
      <div className="flex justify-end gap-4 pb-2">
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
            "preview-code-preview border-foreground/10 rounded-document flex items-center justify-center border p-6",
            className,
          )}
        >
          <div className="w-full">
            {flavor === "base" && base !== undefined ? base : children}
          </div>
        </div>
      ) : (
        <CodeBlock
          className="my-0"
          copyText={activeCode}
          viewportClassName="max-h-96"
          onCopied={() =>
            analytics.code.blockCopied(
              "tsx",
              `docs_preview_${copiedBaseSource ? "base" : codeVariant}`,
            )
          }
        >
          <ShikiHighlighter
            language="tsx"
            theme={{ dark: "catppuccin-mocha", light: "catppuccin-latte" }}
            addDefaultStyles={false}
            showLanguage={false}
          >
            {activeCode.trim()}
          </ShikiHighlighter>
        </CodeBlock>
      )}
    </div>
  );
}
