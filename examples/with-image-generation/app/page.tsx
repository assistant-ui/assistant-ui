"use client";

import { useCallback, useMemo, useState } from "react";
import type {
  ImageGenerationAdapter,
  ImageGenerationResult,
  ImageMessagePart,
  MessagePartStatus,
} from "@assistant-ui/react";
import { useImageGeneration } from "@assistant-ui/react";
import { Image } from "@/components/assistant-ui/image";

type ImageView = ImageMessagePart & { status: MessagePartStatus };

export default function Home() {
  const [prompt, setPrompt] = useState("A golden retriever wearing a top hat");
  const [view, setView] = useState<ImageView | null>(null);

  const adapter = useMemo<ImageGenerationAdapter>(
    () => ({
      async generate(p, opts): Promise<ImageGenerationResult> {
        const res = await fetch("/api/image", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            prompt: p,
            size: opts?.size,
            seed: opts?.seed,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      },
    }),
    [],
  );

  const { generate, isGenerating, error } = useImageGeneration(adapter, {
    onImageGenerated: (info) => {
      // eslint-disable-next-line no-console
      console.log("[image]", info);
    },
  });

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setView({
        type: "image",
        image: "",
        prompt,
        status: { type: "running" },
      });
      try {
        const result = await generate(prompt);
        setView({
          type: "image",
          image: result.image,
          prompt,
          ...(result.mimeType && { mimeType: result.mimeType }),
          ...(typeof result.metadata?.revisedPrompt === "string" && {
            revisedPrompt: result.metadata.revisedPrompt as string,
          }),
          status: { type: "complete" },
        });
      } catch {
        setView({
          type: "image",
          image: "",
          prompt,
          status: { type: "incomplete", reason: "error" },
        });
      }
    },
    [generate, prompt],
  );

  return (
    <main className="mx-auto flex h-full max-w-xl flex-col gap-4 p-6">
      <header>
        <h1 className="font-semibold text-xl">Image Generation</h1>
        <p className="text-muted-foreground text-sm">
          Demonstrates <code>useImageGeneration</code> + the{" "}
          <code>@assistant-ui/ui</code> Image primitive with actions.
        </p>
      </header>

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe an image…"
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="rounded bg-primary px-3 py-2 text-primary-foreground disabled:opacity-50"
        >
          {isGenerating ? "Generating…" : "Generate"}
        </button>
      </form>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error.message}
        </p>
      )}

      {view && (
        <div className="space-y-2">
          <Image {...view} />
          {view.revisedPrompt && (
            <p className="text-muted-foreground text-xs">
              <strong>Revised prompt:</strong> {view.revisedPrompt}
            </p>
          )}
          {view.status.type === "complete" && view.image && (
            <Image.Actions
              part={view}
              adapter={adapter}
              regenerateOptions={{
                pricingHint: "~$0.19 per HD image",
                rateLimit: { maxPerMinute: 3 },
              }}
              onRegenerateStart={() => {
                setView((prev) =>
                  prev ? { ...prev, status: { type: "running" } } : prev,
                );
              }}
              onRegenerated={(result) => {
                setView({
                  type: "image",
                  image: result.image,
                  prompt,
                  ...(result.mimeType && { mimeType: result.mimeType }),
                  ...(typeof result.metadata?.revisedPrompt === "string" && {
                    revisedPrompt: result.metadata.revisedPrompt as string,
                  }),
                  status: { type: "complete" },
                });
              }}
              onRegenerateError={() => {
                setView((prev) =>
                  prev
                    ? {
                        ...prev,
                        status: { type: "incomplete", reason: "error" },
                      }
                    : prev,
                );
              }}
            />
          )}
        </div>
      )}
    </main>
  );
}
