"use client";

import { Tabs as TabsPrimitive } from "radix-ui";
import { CodeIcon, EyeIcon } from "lucide-react";
import { ArtifactPrimitive } from "@assistant-ui/react";

export const ArtifactView = () => (
  <ArtifactPrimitive.If fallback={null}>
    <TabsPrimitive.Root
      defaultValue="preview"
      className="flex h-full w-full flex-col overflow-hidden rounded-lg border"
    >
      <TabsPrimitive.List className="flex items-center border-b">
        <TabsPrimitive.Trigger
          value="source"
          className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 font-medium text-sm"
        >
          <CodeIcon className="size-4" /> Source
        </TabsPrimitive.Trigger>
        <TabsPrimitive.Trigger
          value="preview"
          className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 font-medium text-sm"
        >
          <EyeIcon className="size-4" /> Preview
        </TabsPrimitive.Trigger>
        <span className="ml-auto flex items-center gap-1 px-3 text-muted-foreground text-xs">
          <ArtifactPrimitive.VersionPicker.Previous>
            ‹
          </ArtifactPrimitive.VersionPicker.Previous>
          <ArtifactPrimitive.VersionPicker.Number /> /{" "}
          <ArtifactPrimitive.VersionPicker.Count />
          <ArtifactPrimitive.VersionPicker.Next>
            ›
          </ArtifactPrimitive.VersionPicker.Next>
        </span>
      </TabsPrimitive.List>
      <TabsPrimitive.Content
        value="source"
        className="h-full overflow-y-auto whitespace-pre-line break-words px-4 py-2 font-mono text-sm"
      >
        <ArtifactPrimitive.Source />
      </TabsPrimitive.Content>
      <TabsPrimitive.Content value="preview" className="flex h-full flex-1">
        <ArtifactPrimitive.Preview className="h-full w-full" />
      </TabsPrimitive.Content>
    </TabsPrimitive.Root>
  </ArtifactPrimitive.If>
);
