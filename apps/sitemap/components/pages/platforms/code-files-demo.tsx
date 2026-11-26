"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { DeferredHighlight } from "@/components/shared/deferred-highlight";
import { DemoFrame } from "@/components/shared/demo-frame";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

export type CodeFile = { path: string; language: string; code: string };

const fileName = (path: string) => path.split("/").at(-1) ?? path;

/** Real setup files to switch between and copy, for a platform with nothing to run on the page. */
export function CodeFilesDemo({
  files,
  caption,
}: {
  files: readonly CodeFile[];
  caption: string;
}) {
  const [path, setPath] = useState(files[0]!.path);
  const file = files.find((entry) => entry.path === path) ?? files[0]!;
  const { isCopied, copyToClipboard } = useCopyToClipboard({
    copiedDuration: 2000,
  });

  return (
    <DemoFrame
      above={
        <Tabs value={path} onValueChange={(value) => setPath(String(value))}>
          <TabsList className="bg-background border-foreground/10 max-w-full justify-start overflow-x-auto border">
            {files.map((entry) => (
              <TabsTrigger
                key={entry.path}
                value={entry.path}
                className="data-active:bg-muted flex-none px-2.5 font-mono text-xs [font-variant-ligatures:none]"
              >
                {fileName(entry.path)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      }
      caption={caption}
      frameClassName="h-[26rem]"
    >
      <div className="border-foreground/10 flex h-11 shrink-0 items-center gap-2 border-b ps-4 pe-2">
        <span className="text-muted-foreground min-w-0 flex-1 truncate font-mono text-xs [font-variant-ligatures:none]">
          {file.path}
        </span>
        <button
          type="button"
          onClick={() => copyToClipboard(file.code)}
          aria-label={`Copy ${file.path}`}
          className="text-muted-foreground hover:text-foreground hover:bg-foreground/[0.05] focus-visible:ring-ring inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors outline-none focus-visible:ring-2"
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
    </DemoFrame>
  );
}
