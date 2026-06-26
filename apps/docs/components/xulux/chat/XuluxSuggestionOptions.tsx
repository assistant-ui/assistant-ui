"use client";

import type { SyntaxHighlighterProps } from "@assistant-ui/react-streamdown";
import { ThreadPrimitive } from "@assistant-ui/react";

type XuluxSuggestionOption = {
  label: string;
  prompt: string;
};

type XuluxSuggestionOptionsData = {
  question?: string;
  options: XuluxSuggestionOption[];
};

function parseSuggestionOptions(
  code: string,
): XuluxSuggestionOptionsData | null {
  let value: unknown;
  try {
    value = JSON.parse(code);
  } catch {
    return null;
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const rawOptions = record.options;
  if (!Array.isArray(rawOptions)) return null;

  const options = rawOptions.flatMap((rawOption): XuluxSuggestionOption[] => {
    if (!rawOption || typeof rawOption !== "object") return [];
    if (Array.isArray(rawOption)) return [];

    const option = rawOption as Record<string, unknown>;
    if (typeof option.label !== "string" || typeof option.prompt !== "string") {
      return [];
    }

    const label = option.label.trim();
    const prompt = option.prompt.trim();
    if (!label || !prompt) return [];

    return [{ label, prompt }];
  });

  if (options.length === 0) return null;

  const question =
    typeof record.question === "string" ? record.question.trim() : "";

  return {
    ...(question ? { question } : {}),
    options,
  };
}

export function XuluxSuggestionOptions({ code }: SyntaxHighlighterProps) {
  const data = parseSuggestionOptions(code);
  if (!data) return null;

  return (
    <div className="border-border/60 bg-muted/20 my-3 rounded-lg border p-3">
      {data.question ? (
        <div className="text-muted-foreground mb-2 text-xs font-medium">
          {data.question}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {data.options.map((option, index) => (
          <ThreadPrimitive.Suggestion
            key={`${option.label}:${index}`}
            prompt={option.prompt}
            send
            className="border-border bg-background hover:bg-muted text-foreground inline-flex min-h-8 max-w-full items-center rounded-md border px-3 py-1.5 text-left text-xs leading-snug transition-colors"
          >
            {option.label}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}
