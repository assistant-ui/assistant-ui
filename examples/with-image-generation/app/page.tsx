"use client";

import { useCallback, useState } from "react";
import type { ImageMessagePart, MessagePartStatus } from "@assistant-ui/react";
import { Image } from "@/components/assistant-ui/image";

type ImageView = ImageMessagePart & { status: MessagePartStatus };

export default function Home() {
  const [prompt, setPrompt] = useState("A golden retriever wearing a top hat");
  const [activePrompt, setActivePrompt] = useState("");
  const [view, setView] = useState<ImageView | null>(null);
  const [revisedPrompt, setRevisedPrompt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (p: string) => {
    setIsGenerating(true);
    setActivePrompt(p);
    setError(null);
    setRevisedPrompt(null);
    setView({ type: "image", image: "", status: { type: "running" } });
    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      if (!res.ok) throw new Error(await res.text());
      const result = (await res.json()) as {
        image: string;
        metadata?: { revisedPrompt?: string };
      };
      setView({
        type: "image",
        image: result.image,
        status: { type: "complete" },
      });
      if (typeof result.metadata?.revisedPrompt === "string") {
        setRevisedPrompt(result.metadata.revisedPrompt);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setView({
        type: "image",
        image: "",
        status: { type: "incomplete", reason: "error" },
      });
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return (
    <main className="mx-auto flex h-full max-w-xl flex-col gap-4 p-6">
      <header>
        <h1 className="text-xl font-semibold">Image Generation</h1>
        <p className="text-muted-foreground text-sm">
          Calls a server route that runs <code>ai.generateImage</code> and
          renders the result with the <code>@assistant-ui/ui</code> Image
          component.
        </p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void generate(prompt);
        }}
        className="flex gap-2"
      >
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe an image…"
          className="flex-1 rounded border px-3 py-2"
        />
        <button
          type="submit"
          disabled={isGenerating || !prompt.trim()}
          className="bg-primary text-primary-foreground rounded px-3 py-2 disabled:opacity-50"
        >
          {isGenerating ? "Generating…" : "Generate"}
        </button>
      </form>

      {error && (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      )}

      {view && (
        <div className="space-y-2">
          <Image {...view} />
          {revisedPrompt && (
            <p className="text-muted-foreground text-xs">
              <strong>Revised prompt:</strong> {revisedPrompt}
            </p>
          )}
          {view.status.type === "complete" && view.image && (
            <Image.Actions
              part={view}
              onRegenerate={() => generate(activePrompt)}
            />
          )}
        </div>
      )}
    </main>
  );
}
