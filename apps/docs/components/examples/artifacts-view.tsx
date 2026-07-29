"use client";

import { useAuiState } from "@assistant-ui/react";
import type { ToolCallMessagePart } from "@assistant-ui/react";
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

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
      .at(-1)?.args.code as string | undefined;
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
            <TabsPrimitive.Tab
              value="source"
              className="data-active:border-primary border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-colors hover:border-gray-300"
            >
              Source Code
            </TabsPrimitive.Tab>
            <TabsPrimitive.Tab
              value="preview"
              className="data-active:border-primary border-b-2 border-transparent px-4 py-2 text-sm font-medium transition-colors hover:border-gray-300"
            >
              Preview
            </TabsPrimitive.Tab>
          </TabsPrimitive.List>
          <TabsPrimitive.Panel
            value="source"
            className="grow overflow-y-scroll px-4 py-2 font-mono text-sm wrap-break-word whitespace-pre-line"
          >
            {artifact}
          </TabsPrimitive.Panel>
          <TabsPrimitive.Panel value="preview" className="grow px-4 py-2">
            {artifact && (
              <iframe
                title="artifact-preview"
                className="h-full w-full"
                sandbox="allow-scripts allow-forms"
                srcDoc={artifact}
              />
            )}
          </TabsPrimitive.Panel>
        </TabsPrimitive.Root>
      </div>
    </div>
  );
};
