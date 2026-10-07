"use client";

import { useState } from "react";
import ShikiHighlighter from "react-shiki";
import { CodeBlock } from "@/components/ui/code-block";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export function BundleSource({
  files,
}: {
  files: { path: string; content: string }[];
}) {
  const [selected, setSelected] = useState(files[0]?.path ?? "");
  return (
    <Tabs value={selected} onValueChange={setSelected}>
      <TabsList className="max-w-full flex-wrap justify-start group-data-[orientation=horizontal]/tabs:h-auto">
        {files.map((file) => (
          <TabsTrigger
            key={file.path}
            value={file.path}
            className="h-8 flex-none"
          >
            {file.path.startsWith("ui/")
              ? file.path.split("/").at(-1)
              : file.path}
          </TabsTrigger>
        ))}
      </TabsList>
      {files.map((file) => (
        <TabsContent key={file.path} value={file.path}>
          <CodeBlock
            title={file.path}
            copyText={file.content}
            className="my-0"
            viewportClassName="max-h-96"
          >
            <ShikiHighlighter
              language="tsx"
              theme={{ light: "github-light", dark: "github-dark" }}
            >
              {file.content}
            </ShikiHighlighter>
          </CodeBlock>
        </TabsContent>
      ))}
    </Tabs>
  );
}
