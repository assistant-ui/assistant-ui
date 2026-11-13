"use client";

import { useState } from "react";
import { usePanelRef } from "react-resizable-panels";
import { NewTabCue } from "@/components/shared/new-tab-cue";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BlockFileSource } from "@/lib/block-source";
import { BlockFileTree } from "./block-file-tree";
import { BlockPreview } from "./block-preview";

type View = "preview" | "code";

const WIDTHS = [
  { label: "Desktop", size: 100 },
  { label: "Tablet", size: 60 },
  { label: "Mobile", size: 32 },
] as const;

const MIN_WIDTH = WIDTHS[2].size;

/**
 * A block with its toolbar: the live preview at a width you choose, or the
 * files it installs as a tree beside their source.
 */
export function BlockViewer({
  slug,
  files,
}: {
  slug: string;
  files: BlockFileSource[];
}) {
  const [view, setView] = useState<View>("preview");
  const [width, setWidth] = useState(100);
  const [previewKey, setPreviewKey] = useState(0);
  const [activePath, setActivePath] = useState(files[0]?.path);
  const previewPanel = usePanelRef();
  const activeFile = files.find((file) => file.path === activePath);

  return (
    <Tabs
      value={view}
      onValueChange={(next) => setView(next as View)}
      className="h-full w-full min-w-0 gap-0 text-start"
    >
      <div className="border-foreground/10 flex h-11 shrink-0 items-center gap-2 border-b px-2">
        <TabsList aria-label="View" className="h-8">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        <div className="ms-auto flex items-center gap-1">
          {view === "preview" ? (
            <>
              <div
                role="group"
                aria-label="Preview width"
                className="hidden items-center gap-0.5 lg:flex"
              >
                {WIDTHS.map(({ label, size }) => {
                  const pressed = Math.abs(width - size) < 1;
                  return (
                    <Button
                      key={label}
                      size="sm"
                      variant={pressed ? "secondary" : "ghost"}
                      aria-pressed={pressed}
                      onClick={() => previewPanel.current?.resize(`${size}%`)}
                    >
                      {label}
                    </Button>
                  );
                })}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPreviewKey((key) => key + 1)}
              >
                Reset
              </Button>
            </>
          ) : null}
          <Button
            size="sm"
            variant="ghost"
            nativeButton={false}
            render={
              <a
                href={`/blocks/view/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open full page
                <NewTabCue />
              </a>
            }
          />
        </div>
      </div>

      <TabsContent
        value="preview"
        keepMounted
        className="bg-foreground/[0.025] dark:bg-foreground/[0.04] min-h-0"
      >
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel
            panelRef={previewPanel}
            defaultSize="100%"
            minSize={`${MIN_WIDTH}%`}
            onResize={(size) => setWidth(size.asPercentage)}
            className="bg-background"
          >
            <BlockPreview key={previewKey} slug={slug} />
          </ResizablePanel>
          <ResizableHandle
            withHandle
            aria-label="Resize preview"
            className="hidden lg:flex"
          />
          <ResizablePanel defaultSize="0%" minSize="0%" />
        </ResizablePanelGroup>
      </TabsContent>

      <TabsContent value="code" className="min-h-0">
        <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[16rem_minmax(0,1fr)] md:grid-rows-1">
          <div className="border-foreground/10 max-h-44 overflow-y-auto border-b p-2 md:max-h-none md:border-e md:border-b-0">
            <BlockFileTree
              paths={files.map((file) => file.path)}
              active={activeFile?.path ?? ""}
              onSelect={setActivePath}
            />
          </div>
          {activeFile ? (
            <CodeBlock
              key={activeFile.path}
              className="my-0 h-full min-h-0 rounded-none border-0 [&>div]:flex [&>div]:min-h-0 [&>div]:flex-1 [&>div]:flex-col"
              viewportClassName="min-h-0 flex-1 overflow-y-auto"
              title={activeFile.path}
              copyText={activeFile.code}
            >
              <div dangerouslySetInnerHTML={{ __html: activeFile.html }} />
            </CodeBlock>
          ) : null}
        </div>
      </TabsContent>
    </Tabs>
  );
}
