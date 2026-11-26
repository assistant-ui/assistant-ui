"use client";

import { useRef, useState } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  File,
  Folder,
  Maximize,
  Monitor,
  Palette,
  RotateCw,
  Smartphone,
  Tablet,
} from "lucide-react";
import { usePanelRef } from "react-resizable-panels";
import { TooltipIconButton } from "@/components/assistant-ui/elements/tooltip-icon-button";
import { DeferredHighlight } from "@/components/shared/deferred-highlight";
import { LiveDot } from "@/components/shared/live-dot";
import { CodeBlock } from "@/components/ui/code-block";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BlockElement, BlockFile } from "@/lib/library/catalog";
import blockRegistry from "@/registry/registry.json";
import { BlockPreview } from "./block-previews";
import { RegistryStyleScope } from "./registry-style-scope";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuLabel,
  MenuLinkItem,
  MenuRadioGroup,
  MenuRadioItem,
  MenuTrigger,
} from "./ui/menu";
import { cn } from "@/lib/utils";

type Tab = "preview" | "code";

/** The block's own look, before any registry style is laid over it. */
const NO_STYLE = "default";

/** The registry's styles, which the preview can be drawn in. */
const STYLES = blockRegistry.items.flatMap((item) =>
  item.type === "registry:style"
    ? [{ name: item.name, title: item.title }]
    : [],
);

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

/**
 * A library block, running in a resizable frame beside its source files.
 */
export function BlockViewer({
  slug,
  title,
  files,
  entry,
  elements,
}: {
  slug: string;
  title: string;
  files: readonly BlockFile[];
  entry: string;
  elements: readonly BlockElement[];
}) {
  const [tab, setTab] = useState<Tab>("preview");
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [reloads, setReloads] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [style, setStyle] = useState(NO_STYLE);
  const frameRef = useRef<HTMLDivElement>(null);
  const panelRef = usePanelRef();

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
        {elements.length > 0 && (
          <Menu>
            <MenuTrigger className="border-foreground/10 text-muted-foreground hover:text-foreground h-8 gap-1.5 rounded-md border px-2.5 text-xs">
              <span className="text-foreground tabular-nums">
                {elements.length}
              </span>
              {elements.length === 1 ? "element" : "elements"}
              <ChevronDown aria-hidden className="size-3.5!" />
            </MenuTrigger>
            <MenuContent align="start">
              <MenuGroup>
                <MenuLabel>assistant-ui elements in {title}</MenuLabel>
                {elements.map((element) => (
                  <MenuLinkItem
                    key={element.slug}
                    href={element.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className="flex-1">{element.title}</span>
                    <ArrowUpRight
                      aria-hidden
                      className="text-muted-foreground size-3.5!"
                    />
                  </MenuLinkItem>
                ))}
              </MenuGroup>
            </MenuContent>
          </Menu>
        )}
        {STYLES.length > 0 && (
          <div className="border-foreground/10 ms-auto flex h-8 items-center rounded-md border p-[3px]">
            <Menu>
              <MenuTrigger
                aria-pressed={style !== NO_STYLE}
                className={cn(
                  control,
                  "justify-center p-0",
                  style !== NO_STYLE && "bg-foreground/[0.06] text-foreground",
                )}
                render={<TooltipIconButton tooltip="Theme" />}
              >
                <Palette aria-hidden />
              </MenuTrigger>
              <MenuContent align="end">
                <MenuGroup>
                  <MenuLabel>Preview in a theme</MenuLabel>
                  <MenuRadioGroup
                    value={style}
                    onValueChange={(value) => {
                      setTab("preview");
                      setStyle(value as string);
                    }}
                  >
                    <MenuRadioItem value={NO_STYLE}>Default</MenuRadioItem>
                    {STYLES.map((item) => (
                      <MenuRadioItem key={item.name} value={item.name}>
                        {item.title}
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuGroup>
              </MenuContent>
            </Menu>
          </div>
        )}
        <div
          className={cn(
            "border-foreground/10 flex h-8 items-center gap-1 rounded-md border p-[3px]",
            STYLES.length === 0 && "ms-auto",
          )}
        >
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
                  requestAnimationFrame(() =>
                    panelRef.current?.resize(item.size),
                  );
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
              setTimeout(() => {
                setReloads((count) => count + 1);
                setRefreshing(false);
              }, 150);
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
      </div>

      <figure>
        <TabsContent value="preview" keepMounted>
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
                <div
                  key={reloads}
                  className={cn(
                    "h-full w-full transition-opacity duration-200 motion-reduce:transition-none",
                    refreshing && "opacity-0",
                  )}
                >
                  <RegistryStyleScope name={style} className="size-full">
                    <BlockPreview slug={slug} />
                  </RegistryStyleScope>
                </div>
              </ResizablePanel>
              <ResizableHandle
                aria-label="Resize preview"
                className="after:bg-foreground/15 hover:after:bg-foreground/25 relative hidden w-3 bg-transparent p-0 after:start-auto after:end-0 after:top-1/2 after:bottom-auto after:h-8 after:w-1.5 after:translate-x-[-1px] after:-translate-y-1/2 after:rounded-full after:transition-all hover:after:h-10 motion-reduce:after:transition-none md:flex [:fullscreen_&]:hidden"
              />
              <ResizablePanel defaultSize="0%" minSize="0%" />
            </ResizablePanelGroup>
          </div>
        </TabsContent>
        <TabsContent value="code">
          <BlockCode name={slug} files={files} entry={entry} />
        </TabsContent>
        <figcaption className="text-muted-foreground/70 mt-2 flex items-baseline justify-between text-xs">
          <span>{title}</span>
          {tab === "code" ? (
            <span className="tabular-nums">
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <LiveDot />
              live
            </span>
          )}
        </figcaption>
      </figure>
    </Tabs>
  );
}
