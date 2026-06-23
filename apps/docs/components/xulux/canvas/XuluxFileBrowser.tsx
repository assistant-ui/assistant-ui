"use client";

import { useCallback, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  File as FileIcon,
  Folder,
  FolderOpen,
} from "lucide-react";
import ShikiHighlighter from "react-shiki";
import { cn } from "@/lib/utils";
import type { FileTreeNode, VirtualArchive } from "@/lib/xulux/virtual-archive";

const LANG_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  md: "markdown",
  mdx: "markdown",
  css: "css",
  scss: "scss",
  html: "html",
  xml: "xml",
  svg: "xml",
  yml: "yaml",
  yaml: "yaml",
  toml: "toml",
  env: "bash",
};

function langFromPath(path: string): string | null {
  const ext = path.includes(".") ? path.split(".").pop()!.toLowerCase() : "";
  return LANG_MAP[ext] ?? null;
}

type Props = {
  archive: VirtualArchive;
};

export function XuluxFileBrowser({ archive }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const dirs = archive.tree
      .filter((node) => node.type === "directory")
      .map((node) => node.path);
    return new Set(dirs);
  });
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const toggleDir = useCallback((path: string) => {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const openFile = useCallback((path: string) => {
    setSelectedPath(path);
  }, []);

  const fileContent = useMemo(() => {
    if (!selectedPath) return null;
    if (!archive.isText(selectedPath)) return null;
    return archive.readText(selectedPath);
  }, [archive, selectedPath]);

  const renderNode = (node: FileTreeNode, depth: number) => {
    const isDir = node.type === "directory";
    const isOpen = expanded.has(node.path);
    const isSelected = selectedPath === node.path;

    return (
      <div key={node.path}>
        <button
          type="button"
          onClick={() => (isDir ? toggleDir(node.path) : openFile(node.path))}
          className={cn(
            "hover:bg-muted flex w-full items-center gap-1.5 rounded-sm py-1 pr-2 text-left text-xs",
            isSelected && !isDir && "bg-muted font-medium",
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          {isDir ? (
            isOpen ? (
              <ChevronDown className="text-muted-foreground size-3.5 shrink-0" />
            ) : (
              <ChevronRight className="text-muted-foreground size-3.5 shrink-0" />
            )
          ) : (
            <span className="inline-block size-3.5 shrink-0" />
          )}
          {isDir ? (
            isOpen ? (
              <FolderOpen className="text-muted-foreground size-3.5 shrink-0" />
            ) : (
              <Folder className="text-muted-foreground size-3.5 shrink-0" />
            )
          ) : (
            <FileIcon className="text-muted-foreground size-3.5 shrink-0" />
          )}
          <span className="truncate">{node.name}</span>
        </button>
        {isDir && isOpen && node.children?.map((c) => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex h-full min-h-0">
      {/* Tree sidebar */}
      <div className="flex w-1/3 max-w-[320px] min-w-[180px] flex-col border-r">
        <div className="flex shrink-0 items-center border-b px-2 py-1.5">
          <span className="text-muted-foreground text-xs">
            {archive.fileCount} files
          </span>
        </div>
        <div className="min-h-0 flex-1 overflow-auto py-1">
          {archive.tree.map((n) => renderNode(n, 0))}
        </div>
      </div>

      {/* Content pane */}
      <div className="flex min-w-0 flex-1 flex-col">
        {selectedPath ? (
          <>
            <div className="flex shrink-0 items-center gap-2 border-b px-3 py-1.5">
              <span className="text-muted-foreground truncate font-mono text-xs">
                {selectedPath}
              </span>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {archive.isText(selectedPath) && fileContent !== null ? (
                langFromPath(selectedPath) ? (
                  <div className="[&_code]:!text-xs [&_pre]:!bg-transparent [&_pre]:!p-4 [&_pre]:!text-xs [&_pre]:!leading-relaxed">
                    <ShikiHighlighter
                      language={langFromPath(selectedPath)!}
                      theme={{
                        dark: "github-dark-default",
                        light: "github-light-default",
                      }}
                      addDefaultStyles={false}
                      showLanguage={false}
                      defaultColor={false}
                    >
                      {fileContent}
                    </ShikiHighlighter>
                  </div>
                ) : (
                  <pre className="p-4 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap">
                    {fileContent}
                  </pre>
                )
              ) : (
                <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-sm">
                  Binary file — cannot display preview.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center p-6 text-center text-sm">
            Select a file to view its contents.
          </div>
        )}
      </div>
    </div>
  );
}
