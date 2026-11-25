"use client";

import type { CSSProperties, ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const BODY: CSSProperties = { height: "30rem" };

/**
 * A demo as one file in a window: the file's name in the title bar, and a
 * switch between the preview and the code. The preview stays mounted while
 * the code is open, so a test chat survives a look at the code.
 */
export function DemoWindow({
  name,
  html,
  preview,
}: {
  name: string;
  html: string;
  preview: ReactNode;
}) {
  return (
    <Tabs
      defaultValue="preview"
      className="border-foreground/10 rounded-document bg-background min-w-0 gap-0 overflow-hidden border"
    >
      <div className="border-foreground/10 flex h-11 items-center justify-between gap-3 border-b ps-4 pe-1.5">
        <span className="text-muted-foreground min-w-0 truncate font-mono text-xs">
          {name}
        </span>
        <TabsList
          aria-label={`${name}: code or preview`}
          className="h-8 shrink-0"
        >
          <TabsTrigger value="code" className="px-2.5 text-[13px]">
            Code
          </TabsTrigger>
          <TabsTrigger value="preview" className="px-2.5 text-[13px]">
            Preview
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        value="preview"
        keepMounted
        className="relative flex-none"
        style={BODY}
      >
        {preview}
      </TabsContent>
      <TabsContent
        value="code"
        className="min-w-0 flex-none overflow-auto"
        style={BODY}
      >
        <div
          className="px-5 py-4 font-mono text-[13px] leading-relaxed [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:whitespace-pre"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </TabsContent>
    </Tabs>
  );
}
