"use client";

import { ArtifactPrimitive } from "@assistant-ui/react";
import { Tabs as TabsPrimitive } from "radix-ui";

export const ArtifactsView = () => (
  <ArtifactPrimitive.If fallback={null}>
    <div className="flex grow basis-full justify-stretch p-3 transition-[width]">
      <div className="h-full w-full overflow-hidden rounded-lg border">
        <TabsPrimitive.Root
          defaultValue="source"
          className="flex h-full flex-col"
        >
          <TabsPrimitive.List className="grid w-full grid-cols-2 border-b">
            <TabsPrimitive.Trigger
              value="source"
              className="border-transparent border-b-2 px-4 py-2 font-medium text-sm transition-colors hover:border-gray-300 data-[state=active]:border-primary"
            >
              Source Code
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger
              value="preview"
              className="border-transparent border-b-2 px-4 py-2 font-medium text-sm transition-colors hover:border-gray-300 data-[state=active]:border-primary"
            >
              Preview
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>
          <TabsPrimitive.Content
            value="source"
            className="wrap-break-word grow overflow-y-scroll whitespace-pre-line px-4 py-2 font-mono text-sm"
          >
            <ArtifactPrimitive.Source />
          </TabsPrimitive.Content>
          <TabsPrimitive.Content value="preview" className="grow px-4 py-2">
            <ArtifactPrimitive.Preview className="h-full w-full" />
          </TabsPrimitive.Content>
        </TabsPrimitive.Root>
      </div>
    </div>
  </ArtifactPrimitive.If>
);
