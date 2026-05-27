"use client";

import { Renderer } from "@openuidev/react-lang";
import { guiLibrary, primitiveExampleSource } from "@/components/gui/library";
import { ExampleNav } from "@/components/example-nav";

export default function GenerativeUIPrimitivePage() {
  return (
    <div className="flex h-full flex-col">
      <ExampleNav />
      <main className="mx-auto flex h-full max-w-2xl flex-col gap-6 overflow-y-auto p-8">
        <header>
          <h1 className="text-2xl font-bold">MessagePrimitive.GenerativeUI</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Agent-described React UI rendered from OpenUI Lang via a
            consumer-defined library (Zod schemas are the security boundary).
          </p>
        </header>

        <section className="flex flex-col gap-4">
          <Renderer library={guiLibrary} response={primitiveExampleSource} />
        </section>
      </main>
    </div>
  );
}
