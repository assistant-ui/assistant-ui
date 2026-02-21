"use client";

import { useAuiState } from "@assistant-ui/react";
import type { ToolCallMessagePart } from "@assistant-ui/react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

export const ArtifactsView = () => {
  const artifact = useAuiState((s) => {
    const messages = s.thread.messages || [];
    return messages
      .flatMap((m) =>
        m.content.filter(
          (c): c is ToolCallMessagePart =>
            c.type === "tool-call" && c.toolName === "render_html",
        ),
      )
      .at(-1)?.args["code"] as string | undefined;
  });

  if (!artifact) return null;

  return (
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
            {artifact}
          </TabsPrimitive.Content>
          <TabsPrimitive.Content value="preview" className="grow px-4 py-2">
            {artifact && (
              <iframe
                title="artifact-preview"
                className="h-full w-full"
                srcDoc={artifact}
              />
            )}
          </TabsPrimitive.Content>
        </TabsPrimitive.Root>
      </div>
    </div>
  );
};
