"use client";

import type { CSSProperties, ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type DemoFileView = {
  path: string;
  html: string;
};

const HEIGHT: CSSProperties = { height: "30rem" };

const FIELD =
  "bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document flex-none";

/** A demo's preview and its files, one tab each. */
export function DemoTabs({
  label,
  files,
  preview,
}: {
  label: string;
  files: readonly DemoFileView[];
  preview?: ReactNode;
}) {
  return (
    <Tabs defaultValue="preview" className="min-w-0 gap-3">
      <TabsList
        variant="line"
        aria-label={`${label}: preview and files`}
        className="h-auto max-w-full justify-start overflow-x-auto pb-2"
      >
        <TabsTrigger value="preview" className="flex-none px-2 text-[13px]">
          Preview
        </TabsTrigger>
        {files.map((file) => (
          <TabsTrigger
            key={file.path}
            value={file.path}
            className="flex-none px-2 font-mono text-[12px]"
          >
            {file.path}
          </TabsTrigger>
        ))}
      </TabsList>
      {preview ? (
        <TabsContent
          value="preview"
          className="border-foreground/10 rounded-document bg-background flex-none overflow-hidden border"
          style={HEIGHT}
        >
          {preview}
        </TabsContent>
      ) : (
        <TabsContent
          value="preview"
          className={`${FIELD} text-muted-foreground flex items-center justify-center p-6 text-center text-[13px]`}
          style={HEIGHT}
        >
          The scripted preview is not built yet. The other tabs show the code it
          will stand in for.
        </TabsContent>
      )}
      {files.map((file) => (
        <TabsContent
          key={file.path}
          value={file.path}
          className={`${FIELD} min-w-0 overflow-auto`}
          style={HEIGHT}
        >
          <div
            className="px-5 py-4 font-mono text-[13px] leading-relaxed [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:whitespace-pre"
            dangerouslySetInnerHTML={{ __html: file.html }}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
