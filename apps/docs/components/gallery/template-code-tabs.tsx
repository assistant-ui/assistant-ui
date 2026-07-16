"use client";

import { useMemo, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import type {
  GenerativeUIDispatch,
  UISpec,
} from "@assistant-ui/react-generative-ui";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/assistant-ui/tabs";
import { generativeUIToJSX } from "@assistant-ui/react-generative-ui";
import { toSlackBlocks } from "@assistant-ui/react-generative-ui/slack";
import {
  GALLERY_USAGE_SNIPPET,
  GALLERY_USAGE_SNIPPET_FULL_STACK,
} from "@/lib/gallery-templates";
import { StyleControls, type StyleControlsProps } from "./style-controls";
import { TemplatePreview } from "./template-preview";
import { CodePanel } from "./code-panel";

export type TemplateCodeTabsProps = {
  tree: UISpec;
  templateTitle: string;
  jsonText: string;
  jsonError: string | null;
  isEdited: boolean;
  onJsonChange: (text: string) => void;
  onReset: () => void;
  styleControls: Omit<StyleControlsProps, "children">;
  dispatch?: GenerativeUIDispatch;
  actionLog?: ReactNode;
};

export function TemplateCodeTabs({
  tree,
  templateTitle,
  jsonText,
  jsonError,
  isEdited,
  onJsonChange,
  onReset,
  styleControls,
  dispatch,
  actionLog,
}: TemplateCodeTabsProps) {
  const reactCode = useMemo(
    () => generativeUIToJSX(tree, { escape: true, pretty: true }),
    [tree],
  );

  const slack = useMemo(() => toSlackBlocks(tree), [tree]);
  const blockKitBuilderUrl = `https://app.slack.com/block-kit-builder/#${encodeURIComponent(
    JSON.stringify({ blocks: slack.blocks }),
  )}`;

  return (
    <Tabs defaultValue="preview">
      <div className="flex items-center justify-between gap-4">
        <TabsList variant="line">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="json">IR JSON</TabsTrigger>
          <TabsTrigger value="code">React code</TabsTrigger>
          <TabsTrigger value="usage">Usage</TabsTrigger>
          <TabsTrigger value="block-kit">Block Kit</TabsTrigger>
        </TabsList>
        {isEdited ? (
          <button
            type="button"
            onClick={onReset}
            className="text-muted-foreground hover:text-foreground text-xs transition-colors"
          >
            Reset
          </button>
        ) : null}
      </div>

      <TabsContent value="preview" className="pt-4">
        <StyleControls {...styleControls}>
          <div className="aui-gallery-canvas">
            <TemplatePreview tree={tree} {...(dispatch ? { dispatch } : {})} />
          </div>
        </StyleControls>
        {actionLog}
      </TabsContent>

      <TabsContent value="json" className="pt-4">
        <div className="flex flex-col gap-2">
          <div className="border-border/60 rounded-xl border p-0.5">
            <textarea
              value={jsonText}
              onChange={(event) => onJsonChange(event.target.value)}
              spellCheck={false}
              aria-label="Edit the IR JSON"
              aria-invalid={jsonError !== null}
              className="bg-card h-96 w-full resize-y rounded-[calc(var(--radius)-2px)] p-3 font-mono text-[0.8125rem] leading-[1.65] outline-none"
            />
          </div>
          {jsonError ? (
            <p className="text-destructive text-xs" role="alert">
              {jsonError}
            </p>
          ) : null}
        </div>
      </TabsContent>

      <TabsContent value="code" className="pt-4">
        <CodePanel code={reactCode} language="tsx" />
      </TabsContent>

      <TabsContent value="usage" className="pt-4">
        <Tabs defaultValue="client">
          <TabsList variant="ghost" size="sm">
            <TabsTrigger value="client">Client toolkit</TabsTrigger>
            <TabsTrigger value="full-stack">Full-stack</TabsTrigger>
          </TabsList>
          <TabsContent value="client">
            <CodePanel code={GALLERY_USAGE_SNIPPET} language="tsx" />
          </TabsContent>
          <TabsContent value="full-stack">
            <CodePanel code={GALLERY_USAGE_SNIPPET_FULL_STACK} language="tsx" />
          </TabsContent>
        </Tabs>
      </TabsContent>

      <TabsContent value="block-kit" className="pt-4">
        <div className="flex flex-col gap-3">
          <a
            href={blockKitBuilderUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${templateTitle} in Block Kit Builder`}
            className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-xs transition-colors"
          >
            <ExternalLink className="size-3.5" />
            Open in Block Kit Builder
          </a>
          <CodePanel
            code={JSON.stringify(slack.blocks, null, 2)}
            language="json"
          />
          {slack.warnings.length > 0 ? (
            <div className="border-border/60 bg-muted/30 rounded-lg border p-3">
              <div className="text-muted-foreground mb-2 text-xs font-medium">
                Conversion notes
              </div>
              <div className="flex flex-col gap-1">
                {slack.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="text-muted-foreground font-mono text-[11px]"
                  >
                    {`${warning.component}: ${warning.detail}`}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </TabsContent>
    </Tabs>
  );
}
