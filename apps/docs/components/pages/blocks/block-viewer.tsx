"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useTheme } from "next-themes";
import {
  ChevronRight,
  ExternalLink,
  File,
  Folder,
  Maximize,
  Monitor,
  RotateCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { usePanelRef } from "react-resizable-panels";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import type { BlockFile } from "@/components/pages/blocks/block-source";
import {
  type BlockTheme,
  type BlockThemeChoice,
  blockThemeStyle,
  DEFAULT_THEME_CHOICE,
  ThemePicker,
} from "@/components/pages/blocks/theme-picker";
import { DeferredHighlight } from "@/components/shared/deferred-highlight";
import { LiveDot } from "@/components/shared/live-dot";
import { CodeBlock } from "@/components/ui/code-block";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
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
  { id: "desktop", label: "Desktop", icon: Monitor, size: "100%" },
  { id: "tablet", label: "Tablet", icon: Tablet, size: "768px" },
  { id: "mobile", label: "Mobile", icon: Smartphone, size: "375px" },
] as const;

type Viewport = (typeof VIEWPORTS)[number]["id"];

const control = "size-6 rounded-sm";

const divider = "bg-foreground/10 mx-0.5 h-4 w-px shrink-0";

const dots =
  "bg-[radial-gradient(color-mix(in_oklab,var(--foreground)_16%,transparent)_1px,transparent_1px)] [background-size:20px_20px]";

const IMAGE_SIZES = "(min-width: 1280px) 1248px, 100vw";

const treeRow =
  "hover:bg-foreground/[0.06] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring flex h-8 w-full items-center gap-2 pe-3 text-left text-sm whitespace-nowrap transition-colors motion-reduce:transition-none [&_svg]:size-4 [&_svg]:shrink-0";

function languageOf(filePath: string) {
  return (
    LANGUAGES[filePath.slice(filePath.lastIndexOf(".") + 1)] ?? "plaintext"
  );
}

/**
 * Paths are relative to the block's directory, and a shared file such as
 * `../chat-sidebar.tsx` sits one level up. When one does, the block's own
 * files are shown inside a folder named after the block, beside it.
 */
function shownPaths(name: string, files: readonly BlockFile[]) {
  if (!files.some((file) => file.path.startsWith("../")))
    return (filePath: string) => filePath;
  return (filePath: string) =>
    filePath.startsWith("../") ? filePath.slice(3) : `${name}/${filePath}`;
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
    <ul className="flex flex-col gap-1">
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
                  className={treeRow}
                  style={{ paddingInlineStart: `${depth * 1.25 + 1}rem` }}
                >
                  <ChevronRight
                    aria-hidden
                    className={cn(
                      "transition-transform motion-reduce:transition-none",
                      open && "rotate-90",
                    )}
                  />
                  <Folder aria-hidden />
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
                  isSelected && "bg-foreground/[0.08] font-medium",
                )}
                style={{ paddingInlineStart: `${depth * 1.25 + 1}rem` }}
              >
                <ChevronRight aria-hidden className="invisible" />
                <File aria-hidden />
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
  name,
  files,
  entry,
}: {
  name: string;
  files: readonly BlockFile[];
  entry: string;
}) {
  const shown = shownPaths(name, files);
  const [selected, setSelected] = useState(() => shown(entry));
  const [closed, setClosed] = useState<ReadonlySet<string>>(new Set());
  const file = files.find((item) => shown(item.path) === selected) ?? files[0];

  const toggle = (path: string) =>
    setClosed((current) => {
      const next = new Set(current);
      if (!next.delete(path)) next.add(path);
      return next;
    });

  return (
    <div className="border-foreground/10 bg-foreground/[0.025] dark:bg-foreground/[0.04] flex flex-col overflow-hidden rounded-xl border md:h-(--height) md:flex-row">
      <div className="border-foreground/10 flex min-w-0 flex-col border-b md:w-72 md:shrink-0 md:border-e md:border-b-0">
        <div className="border-foreground/10 text-muted-foreground flex h-12 shrink-0 items-center border-b px-4 text-sm font-medium">
          Files
        </div>
        <nav
          aria-label={`${name} files`}
          className="max-h-56 overflow-auto py-2 md:max-h-none md:flex-1"
        >
          <TreeItems
            nodes={buildTree(files.map((item) => shown(item.path)))}
            depth={0}
            selected={file ? shown(file.path) : selected}
            closed={closed}
            onSelect={setSelected}
            onToggle={toggle}
          />
        </nav>
      </div>
      {file && (
        <CodeBlock
          key={file.path}
          className="[&>figcaption>span]:text-foreground/80 my-0 min-w-0 flex-1 rounded-none border-0 bg-transparent dark:bg-transparent [&>figcaption]:h-12 [&>figcaption]:ps-4 [&>figcaption]:pe-3 [&>figcaption>span]:text-[13px]"
          title={
            <span className="flex items-center gap-2">
              <File aria-hidden className="size-4 shrink-0 opacity-70" />
              <span className="truncate">{shown(file.path)}</span>
            </span>
          }
          copyText={file.code}
          lineNumbers
          viewportClassName="h-[min(60vh,560px)] overflow-y-auto md:h-[calc(var(--height)-3rem)]"
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
  slug,
  title,
  previewUrl,
  image,
  files,
  entry,
}: Pick<Block, "slug" | "title" | "previewUrl" | "image"> & {
  files: readonly BlockFile[];
  entry: string;
}) {
  const [tab, setTab] = useState<Tab>("preview");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [reloads, setReloads] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const panelRef = usePanelRef();
  const { resolvedTheme } = useTheme();
  const [loaded, setLoaded] = useState(false);
  const [chosenMode, setChosenMode] = useState<BlockTheme["mode"] | null>(null);
  const [choice, setChoice] = useState<BlockThemeChoice>(DEFAULT_THEME_CHOICE);
  const mode = chosenMode ?? (resolvedTheme === "dark" ? "dark" : "light");
  const themedUrl = `${previewUrl}?theme=${mode}`;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const postTheme = () => {
    if (!previewUrl) return;
    iframeRef.current?.contentWindow?.postMessage(
      { type: "aui-block-theme", mode, style: blockThemeStyle(choice) },
      new URL(previewUrl, window.location.href).origin,
    );
  };
  useEffect(postTheme);

  useEffect(() => {
    if (tab !== "preview") return;
    const size = VIEWPORTS.find((item) => item.id === viewport)?.size;
    if (size) panelRef.current?.resize(size);
  }, [tab, viewport]);

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(value as Tab)}
      className="gap-4 [--height:clamp(480px,calc(100svh-17rem),760px)]"
    >
      <div className="flex items-center gap-2">
        <TabsList
          variant="default"
          className="*:h-6 *:rounded-sm *:px-2 *:text-xs group-data-[orientation=horizontal]/tabs:h-8"
        >
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="code">Code</TabsTrigger>
        </TabsList>
        {previewUrl && (
          <div className="border-foreground/10 ms-auto flex h-8 items-center gap-1 rounded-md border p-[3px]">
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
                  onClick={() => {
                    setTab("preview");
                    setViewport(item.id);
                  }}
                  className={cn(
                    control,
                    viewport === item.id &&
                      "bg-foreground/[0.06] text-foreground",
                  )}
                >
                  <item.icon />
                </TooltipIconButton>
              ))}
              <div aria-hidden className={divider} />
            </div>
            <ThemePicker
              theme={{ mode, ...choice }}
              onChange={({ mode: nextMode, ...rest }) => {
                if (nextMode) setChosenMode(nextMode);
                setChoice((current) => ({ ...current, ...rest }));
              }}
              onReset={() => {
                setChosenMode(null);
                setChoice(DEFAULT_THEME_CHOICE);
              }}
              className={control}
            />
            <div aria-hidden className={divider} />
            <TooltipIconButton
              tooltip="Open preview in a new tab"
              onClick={() =>
                window.open(themedUrl, "_blank", "noopener,noreferrer")
              }
              className={control}
            >
              <ExternalLink />
            </TooltipIconButton>
            <TooltipIconButton
              tooltip="Full screen"
              onClick={() => {
                setTab("preview");
                frameRef.current?.requestFullscreen().catch(() => {});
              }}
              className={control}
            >
              <Maximize />
            </TooltipIconButton>
            <div aria-hidden className={divider} />
            <TooltipIconButton
              tooltip="Refresh preview"
              disabled={refreshing}
              onClick={() => {
                setTab("preview");
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
          </div>
        )}
      </div>

      <figure>
        <TabsContent value="preview" keepMounted>
          {previewUrl ? (
            <div
              ref={frameRef}
              className="[&:fullscreen]:bg-background relative h-[min(70vh,560px)] md:h-(--height) [&:fullscreen]:h-screen"
            >
              <div
                aria-hidden
                className={cn(
                  "absolute inset-0 md:end-4 [:fullscreen_&]:hidden",
                  dots,
                )}
              />
              <ResizablePanelGroup
                orientation="horizontal"
                className="relative z-10"
              >
                <ResizablePanel
                  panelRef={panelRef}
                  defaultSize="100%"
                  minSize="320px"
                  onResize={(size) => {
                    if (size.asPercentage > 99) setViewport("desktop");
                  }}
                  className="border-foreground/10 bg-background relative overflow-hidden rounded-xl border [:fullscreen_&]:rounded-none [:fullscreen_&]:border-0"
                >
                  {!loaded && (
                    <Skeleton className="absolute inset-0 rounded-none" />
                  )}
                  <iframe
                    key={reloads}
                    // The address carries only the mode the frame loads with;
                    // later theme changes are posted, so they never reload it.
                    ref={(node) => {
                      iframeRef.current = node;
                      if (node && !node.getAttribute("src"))
                        node.src = themedUrl;
                    }}
                    title={`${title} preview`}
                    allow="microphone; clipboard-write"
                    onLoad={(event) => {
                      if (!event.currentTarget.getAttribute("src")) return;
                      postTheme();
                      setRefreshing(false);
                      setLoaded(true);
                    }}
                    className={cn(
                      "h-full w-full border-none transition-opacity duration-200 motion-reduce:transition-none",
                      (refreshing || !loaded) && "opacity-0",
                    )}
                  />
                </ResizablePanel>
                <ResizableHandle
                  aria-label="Resize preview"
                  className="after:bg-foreground/15 hover:after:bg-foreground/25 relative hidden w-3 bg-transparent p-0 after:start-auto after:end-0 after:top-1/2 after:bottom-auto after:h-8 after:w-1.5 after:translate-x-[-1px] after:-translate-y-1/2 after:rounded-full after:transition-all hover:after:h-10 motion-reduce:after:transition-none md:flex [:fullscreen_&]:hidden"
                />
                <ResizablePanel defaultSize="0%" minSize="0%" />
              </ResizablePanelGroup>
            </div>
          ) : (
            <div
              className={cn(
                "border-foreground/10 relative aspect-[16/10] overflow-hidden rounded-xl border",
                dots,
              )}
            >
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
          <BlockCode name={slug} files={files} entry={entry} />
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
