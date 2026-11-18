"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  ChevronRight,
  ExternalLink,
  Maximize,
  Monitor,
  RotateCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import type { BlockFile } from "@/components/pages/blocks/block-source";
import { DemoIframe } from "@/components/pages/docs/demo-iframe";
import { DeferredHighlight } from "@/components/shared/deferred-highlight";
import { LiveDot } from "@/components/shared/live-dot";
import { CodeBlock } from "@/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Block } from "@/lib/blocks";
import { cn } from "@/lib/utils";

type Tab = "preview" | "code";

type TreeNode = {
  name: string;
  path: string;
  children?: TreeNode[];
};

const LANGUAGES: Record<string, string> = {
  ts: "typescript",
  mts: "typescript",
  tsx: "tsx",
  js: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  jsx: "jsx",
  json: "json",
  css: "css",
  md: "markdown",
  mdx: "mdx",
};

const VIEWPORTS = [
  { id: "desktop", label: "Desktop", icon: Monitor, width: "100%" },
  { id: "tablet", label: "Tablet", icon: Tablet, width: "768px" },
  { id: "mobile", label: "Mobile", icon: Smartphone, width: "375px" },
] as const;

type Viewport = (typeof VIEWPORTS)[number]["id"];

const control = "size-7";

const IMAGE_SIZES = "(min-width: 1280px) 1248px, 100vw";

const treeRow =
  "hover:bg-foreground/[0.04] focus-visible:outline-ring flex w-full items-center gap-1.5 rounded-sm py-1 pe-2 text-left font-mono text-xs [font-variant-ligatures:none] transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 motion-reduce:transition-none [@media(pointer:coarse)]:py-2";

function languageOf(filePath: string) {
  return (
    LANGUAGES[filePath.slice(filePath.lastIndexOf(".") + 1)] ?? "plaintext"
  );
}

function buildTree(paths: readonly string[]): TreeNode[] {
  const roots: TreeNode[] = [];
  for (const filePath of paths) {
    const segments = filePath.split("/");
    let level = roots;
    segments.forEach((name, index) => {
      const nodePath = segments.slice(0, index + 1).join("/");
      let node = level.find((entry) => entry.path === nodePath);
      if (!node) {
        node =
          index < segments.length - 1
            ? { name, path: nodePath, children: [] }
            : { name, path: nodePath };
        level.push(node);
      }
      level = node.children ?? level;
    });
  }
  return sortTree(roots);
}

function sortTree(nodes: TreeNode[]): TreeNode[] {
  return nodes
    .map((node) =>
      node.children ? { ...node, children: sortTree(node.children) } : node,
    )
    .sort(
      (a, b) =>
        Number(Boolean(b.children)) - Number(Boolean(a.children)) ||
        a.name.localeCompare(b.name),
    );
}

function TreeItems({
  nodes,
  depth,
  selected,
  closed,
  onSelect,
  onToggle,
}: {
  nodes: readonly TreeNode[];
  depth: number;
  selected: string;
  closed: ReadonlySet<string>;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
}) {
  return (
    <ul>
      {nodes.map((node) => {
        const open = !closed.has(node.path);
        const isSelected = node.path === selected;
        return (
          <li key={node.path}>
            {node.children ? (
              <>
                <button
                  type="button"
                  aria-expanded={open}
                  onClick={() => onToggle(node.path)}
                  className={cn(treeRow, "text-foreground/70")}
                  style={{ paddingInlineStart: `${depth * 0.75 + 0.375}rem` }}
                >
                  <ChevronRight
                    aria-hidden
                    className={cn(
                      "text-muted-foreground size-3.5 shrink-0 transition-transform motion-reduce:transition-none",
                      open && "rotate-90",
                    )}
                  />
                  <span className="truncate">{node.name}</span>
                </button>
                {open && (
                  <TreeItems
                    nodes={node.children}
                    depth={depth + 1}
                    selected={selected}
                    closed={closed}
                    onSelect={onSelect}
                    onToggle={onToggle}
                  />
                )}
              </>
            ) : (
              <button
                type="button"
                aria-current={isSelected ? "true" : undefined}
                onClick={() => onSelect(node.path)}
                className={cn(
                  treeRow,
                  isSelected
                    ? "bg-foreground/[0.06] text-foreground font-medium"
                    : "text-foreground/70",
                )}
                style={{ paddingInlineStart: `${depth * 0.75 + 1.625}rem` }}
              >
                <span className="truncate">{node.name}</span>
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function BlockCode({
  files,
  entry,
}: {
  files: readonly BlockFile[];
  entry: string;
}) {
  const [selected, setSelected] = useState(entry);
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const file = files.find((item) => item.path === selected) ?? files[0];

  const toggle = (path: string) =>
    setClosed((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  return (
    <div className="border-foreground/10 rounded-document grid overflow-hidden border [--code-height:min(70vh,600px)] md:grid-cols-[15rem_minmax(0,1fr)]">
      <nav
        aria-label="Files"
        className="max-h-56 overflow-y-auto p-2 md:max-h-[calc(var(--code-height)+2.25rem)]"
      >
        <TreeItems
          nodes={buildTree(files.map((item) => item.path))}
          depth={0}
          selected={file?.path ?? selected}
          closed={closed}
          onSelect={setSelected}
          onToggle={toggle}
        />
      </nav>
      {file && (
        <CodeBlock
          key={file.path}
          className="my-0 rounded-none border-0"
          title={file.path}
          copyText={file.code}
          lineNumbers
          viewportClassName="h-(--code-height) overflow-y-auto"
        >
          <DeferredHighlight
            language={languageOf(file.path)}
            theme={{ light: "catppuccin-latte", dark: "catppuccin-mocha" }}
            addDefaultStyles={false}
            showLanguage={false}
          >
            {file.code}
          </DeferredHighlight>
        </CodeBlock>
      )}
    </div>
  );
}

export function BlockViewer({
  title,
  previewUrl,
  image,
  files,
  entry,
}: Pick<Block, "title" | "previewUrl" | "image"> & {
  files: readonly BlockFile[];
  entry: string;
}) {
  const [tab, setTab] = useState<Tab>("preview");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [reloads, setReloads] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const width = VIEWPORTS.find((item) => item.id === viewport)?.width;

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as Tab)}
      className="gap-3"
    >
      <div className="flex items-center justify-between gap-3">
        <TabsList variant="default">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        {previewUrl && tab === "preview" && (
          <div className="flex items-center gap-1">
            <div
              role="group"
              aria-label="Preview width"
              className="hidden items-center gap-1 md:flex"
            >
              {VIEWPORTS.map((item) => (
                <TooltipIconButton
                  key={item.id}
                  tooltip={item.label}
                  aria-pressed={viewport === item.id}
                  onClick={() => setViewport(item.id)}
                  className={cn(
                    control,
                    viewport === item.id &&
                      "bg-foreground/[0.06] text-foreground",
                  )}
                >
                  <item.icon />
                </TooltipIconButton>
              ))}
            </div>
            <TooltipIconButton
              tooltip="Refresh preview"
              disabled={refreshing}
              onClick={() => {
                setRefreshing(true);
                setTimeout(() => setReloads((count) => count + 1), 150);
              }}
              className={control}
            >
              <RotateCw
                className={cn(
                  refreshing && "animate-spin motion-reduce:animate-none",
                )}
              />
            </TooltipIconButton>
            <TooltipIconButton
              tooltip="Open preview in a new tab"
              onClick={() =>
                window.open(
                  `${previewUrl}?theme=${resolvedTheme ?? "light"}`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className={control}
            >
              <ExternalLink />
            </TooltipIconButton>
            <TooltipIconButton
              tooltip="Full screen"
              onClick={() => void frameRef.current?.requestFullscreen()}
              className={control}
            >
              <Maximize />
            </TooltipIconButton>
          </div>
        )}
      </div>

      <figure>
        <TabsContent value="preview" keepMounted>
          {previewUrl ? (
            <div
              ref={frameRef}
              className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document [&:fullscreen]:bg-background flex h-[min(78vh,720px)] justify-center overflow-hidden border [&:fullscreen]:h-screen [&:fullscreen]:rounded-none [&:fullscreen]:border-0"
            >
              <div
                className="bg-background h-full w-full transition-[max-width] duration-200 motion-reduce:transition-none"
                style={{ maxWidth: width }}
              >
                <DemoIframe
                  key={reloads}
                  title={`${title} preview`}
                  src={previewUrl}
                  allow="microphone; clipboard-write"
                  onLoad={() => setRefreshing(false)}
                  className={cn(
                    "h-full w-full border-none transition-opacity duration-200 motion-reduce:transition-none",
                    refreshing && "opacity-0",
                  )}
                />
              </div>
            </div>
          ) : (
            <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] rounded-document relative aspect-[16/10] overflow-hidden border">
              <Image
                src={image.light}
                alt={title}
                fill
                sizes={IMAGE_SIZES}
                className="object-cover object-top dark:hidden"
              />
              <Image
                src={image.dark}
                alt={title}
                fill
                sizes={IMAGE_SIZES}
                className="hidden object-cover object-top dark:block"
              />
            </div>
          )}
        </TabsContent>
        <TabsContent value="code">
          <BlockCode files={files} entry={entry} />
        </TabsContent>
        <figcaption className="text-muted-foreground/70 mt-2 flex items-baseline justify-between text-xs">
          <span>fig. 01</span>
          {tab === "code" ? (
            <span className="tabular-nums">{files.length} files</span>
          ) : previewUrl ? (
            <span className="flex items-center gap-1.5">
              <LiveDot />
              live
            </span>
          ) : (
            <span>screenshot</span>
          )}
        </figcaption>
      </figure>
    </Tabs>
  );
}
