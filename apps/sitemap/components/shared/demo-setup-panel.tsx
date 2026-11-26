"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { DeferredHighlight } from "@/components/shared/deferred-highlight";
import { DemoFrame } from "@/components/shared/demo-frame";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { cn } from "@/lib/utils";

export type SetupFile = { path: string; language: string; code: string };

const fileName = (path: string) => path.split("/").at(-1) ?? path;

function Setup({ files }: { files: readonly SetupFile[] }) {
  const [path, setPath] = useState(files[0]!.path);
  const file = files.find((entry) => entry.path === path) ?? files[0]!;
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });

  return (
    <>
      <div className="border-foreground/10 flex h-11 shrink-0 items-center gap-1 border-b ps-2 pe-2">
        {files.length > 1 ? (
          files.map((entry) => (
            <button
              key={entry.path}
              type="button"
              aria-pressed={entry.path === file.path}
              onClick={() => setPath(entry.path)}
              className={cn(
                "focus-visible:ring-ring h-7 shrink-0 rounded-md px-2 font-mono text-xs transition-colors outline-none [font-variant-ligatures:none] focus-visible:ring-2",
                entry.path === file.path
                  ? "bg-foreground/[0.07] text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {fileName(entry.path)}
            </button>
          ))
        ) : (
          <span className="text-muted-foreground ps-2 font-mono text-xs [font-variant-ligatures:none]">
            {file.path}
          </span>
        )}
        <button
          type="button"
          onClick={() => copyToClipboard(file.code)}
          aria-label={`Copy ${file.path}`}
          className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] focus-visible:ring-ring ms-auto inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2"
        >
          {isCopied ? (
            <CheckIcon aria-hidden className="size-3.5" />
          ) : (
            <CopyIcon aria-hidden className="size-3.5" />
          )}
          <span role="status" className="sr-only">
            {isCopied ? "Copied" : ""}
          </span>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-3.5 font-mono text-[12.5px] leading-relaxed [&_code]:[font-variant-ligatures:none] [&_pre]:m-0 [&_pre]:bg-transparent! [&_pre]:p-0">
        <DeferredHighlight
          key={file.path}
          language={file.language}
          theme={{ light: "github-light", dark: "github-dark" }}
          defaultColor="light-dark()"
          addDefaultStyles={false}
          showLanguage={false}
        >
          {file.code}
        </DeferredHighlight>
      </div>
    </>
  );
}

/**
 * A subject page's hero panel: the live demo first, then the setup that
 * builds it, as two views of one lifted frame.
 */
export function DemoSetupPanel({
  demo,
  demoCaption,
  files,
  setupCaption,
  frameClassName = "h-[30rem]",
}: {
  demo: ReactNode;
  demoCaption: string;
  files: readonly SetupFile[];
  setupCaption: string;
  frameClassName?: string;
}) {
  const [view, setView] = useState("demo");

  return (
    <DemoFrame
      above={
        <Tabs value={view} onValueChange={(value) => setView(String(value))}>
          <TabsList className="bg-background border-foreground/10 border">
            <TabsTrigger
              value="demo"
              className="data-active:bg-muted flex-none px-2.5 text-[13px]"
            >
              Demo
            </TabsTrigger>
            <TabsTrigger
              value="setup"
              className="data-active:bg-muted flex-none px-2.5 text-[13px]"
            >
              Setup
            </TabsTrigger>
          </TabsList>
        </Tabs>
      }
      caption={view === "demo" ? demoCaption : setupCaption}
      frameClassName={frameClassName}
    >
      <div className={cn("min-h-0 flex-1", view !== "demo" && "hidden")}>
        {demo}
      </div>
      {view === "setup" ? <Setup files={files} /> : null}
    </DemoFrame>
  );
}
