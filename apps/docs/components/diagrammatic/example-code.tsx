"use client";

import { use } from "react";
import { CodeBlock } from "@/components/ui/code-block";

type Source = { code: string; html: string };

// Sources are the same for every frame of a file, so a page fetches each once.
// A failed fetch stays cached for the open it failed in, so React's retries
// reach the error boundary instead of fetching again; the next open retries.
const sources = new Map<
  string,
  { promise: Promise<Source>; attempt: number; failed: boolean }
>();

export function loadExampleSource(file: string, attempt = 0): Promise<Source> {
  const cached = sources.get(file);
  if (cached && !(cached.failed && cached.attempt < attempt)) {
    return cached.promise;
  }
  const entry = {
    attempt,
    failed: false,
    promise: fetch(`/api/diagrammatic/examples/${file}`).then((res) => {
      if (!res.ok) throw new Error(`Example source ${file}: ${res.status}`);
      return res.json() as Promise<Source>;
    }),
  };
  entry.promise.catch(() => {
    entry.failed = true;
  });
  sources.set(file, entry);
  return entry.promise;
}

// The Code tab of <Example>. It loads on its own chunk with the source it
// shows, so neither rides along in the HTML or the shared JS of every page.
export function ExampleCode({
  file,
  attempt,
}: {
  file: string;
  attempt: number;
}) {
  const source = use(loadExampleSource(file, attempt));
  return (
    <CodeBlock
      role="tabpanel"
      className="my-0"
      title={`${file}.tsx`}
      copyText={source.code}
      viewportClassName="max-h-[32rem] overflow-y-auto"
    >
      <div dangerouslySetInnerHTML={{ __html: source.html }} />
    </CodeBlock>
  );
}
