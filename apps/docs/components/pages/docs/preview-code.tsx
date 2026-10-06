"use client";

import ShikiHighlighter from "react-shiki";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";
import { useFlavor } from "@/components/pages/docs/contexts/flavor";
import { analytics } from "@/lib/analytics";

type PreviewCodeClientProps = {
  code: string;
  codeVariant: "base" | "radix";
  baseCode?: string;
  children: React.ReactNode;
  base?: React.ReactNode;
  className?: string;
};

export function PreviewCodeClient({
  code,
  codeVariant,
  baseCode,
  children,
  base,
  className,
}: PreviewCodeClientProps) {
  const flavor = useFlavor();

  const copiedBaseSource = flavor === "base" && baseCode !== undefined;
  const activeCode = copiedBaseSource ? baseCode : code;

  return (
    <Tabs defaultValue="preview" className="not-prose my-6 gap-0">
      <TabsList
        activateOnFocus
        variant="line"
        aria-label="Example view"
        className="mb-3 h-11 gap-4 p-0"
      >
        <TabsTrigger value="preview" className="px-0">
          Preview
        </TabsTrigger>
        <TabsTrigger value="code" className="px-0">
          Code
        </TabsTrigger>
      </TabsList>
      <TabsContent value="preview">
        <div
          className={cn(
            "preview-code-preview border-foreground/10 rounded-document flex items-center justify-center border p-4 sm:p-6",
            className,
          )}
        >
          <div className="w-full">
            {flavor === "base" && base !== undefined ? base : children}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="code">
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
      </TabsContent>
    </Tabs>
  );
}
