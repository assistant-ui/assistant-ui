"use client";

import { useState } from "react";
import ShikiHighlighter from "react-shiki";
import { CheckIcon, CopyIcon } from "lucide-react";

import type { BuilderConfig } from "./types";
import { generateRegistryJson } from "@/lib/playground-registry";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { analytics } from "@/lib/analytics";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface BuilderCodeOutputProps {
  config: BuilderConfig;
}

function formatCssBlock(
  selector: string,
  vars: Record<string, string>,
): string {
  const declarations = Object.entries(vars).map(
    ([name, value]) => `  ${name}: ${value};`,
  );
  return declarations.length
    ? `${selector} {\n${declarations.join("\n")}\n}`
    : "";
}

export function BuilderCodeOutput({ config }: BuilderCodeOutputProps) {
  const [selected, setSelected] = useState("thread.aui.tsx");
  const { isCopied: copied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });
  const registry = generateRegistryJson(config);
  const sources = [
    {
      name: "thread.aui.tsx",
      language: "tsx",
      content: registry.files[0]?.content ?? "",
    },
    {
      name: "globals.css",
      language: "css",
      content: [
        formatCssBlock(":root", registry.cssVars.light),
        formatCssBlock(".dark", registry.cssVars.dark),
      ]
        .filter(Boolean)
        .join("\n\n"),
    },
  ];

  const handleCopy = () => {
    analytics.builder.codeCopied();
    copyToClipboard(
      sources.find((source) => source.name === selected)?.content ?? "",
    );
  };

  return (
    <Tabs
      value={selected}
      onValueChange={setSelected}
      className="flex h-full flex-col gap-0 overflow-hidden"
    >
      <div className="flex shrink-0 items-center justify-between px-3 py-2">
        <TabsList variant="line" className="max-w-full">
          {sources.map((source) => (
            <TabsTrigger
              key={source.name}
              value={source.name}
              className="h-8 flex-none text-xs"
            >
              {source.name}
            </TabsTrigger>
          ))}
        </TabsList>
        <button
          type="button"
          onClick={handleCopy}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors"
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
      </div>

      {sources.map((source) => (
        <TabsContent
          key={source.name}
          value={source.name}
          keepMounted
          className="min-h-0 flex-1 overflow-auto px-3 pb-3 text-xs leading-relaxed [&_pre]:m-0! [&_pre]:bg-transparent! [&_pre]:p-0!"
        >
          <ShikiHighlighter
            language={source.language}
            theme={{ dark: "vitesse-dark", light: "vitesse-light" }}
            addDefaultStyles={false}
            showLanguage={false}
            defaultColor="light-dark()"
          >
            {source.content}
          </ShikiHighlighter>
        </TabsContent>
      ))}
    </Tabs>
  );
}
