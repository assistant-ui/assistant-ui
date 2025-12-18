"use client";

import { Builder } from "@/components/builder/builder";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";

export default function PlaygroundPage() {
  return (
    <main className="container mx-auto flex h-[calc(100vh-4rem)] max-w-[1400px] flex-col gap-6 px-4 py-6">
      <div className="space-y-2">
        <h1 className="font-bold text-3xl tracking-tight">Playground</h1>
        <p className="text-muted-foreground">
          Customize your assistant-ui chat interface and generate code to use in
          your project.
        </p>
      </div>

      <div className="min-h-0 flex-1">
        <DocsRuntimeProvider>
          <Builder />
        </DocsRuntimeProvider>
      </div>
    </main>
  );
}
