"use client";

import type { SyntaxHighlighterProps } from "@assistant-ui/react-streamdown";
import { ThreadPrimitive, useAuiState } from "@assistant-ui/react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type XuluxAskQuestionOption = {
  label: string;
  prompt: string;
  preferred?: boolean;
};

type XuluxAskQuestionData = {
  question?: string;
  options: XuluxAskQuestionOption[];
};

function parseAskQuestion(code: string): XuluxAskQuestionData | null {
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

  const options = rawOptions.flatMap((rawOption): XuluxAskQuestionOption[] => {
    if (!rawOption || typeof rawOption !== "object") return [];
    if (Array.isArray(rawOption)) return [];

    const option = rawOption as Record<string, unknown>;
    if (typeof option.label !== "string" || typeof option.prompt !== "string") {
      return [];
    }

    const label = option.label.trim();
    const prompt = option.prompt.trim();
    if (!label || !prompt) return [];

    return [{ label, prompt, preferred: option.preferred === true }];
  });

  if (options.length === 0) return null;
  const sortedOptions = [...options].sort((a, b) => {
    if (a.preferred === b.preferred) return 0;
    return a.preferred ? -1 : 1;
  });

  const question =
    typeof record.question === "string" ? record.question.trim() : "";

  return {
    ...(question ? { question } : {}),
    options: sortedOptions,
  };
}

export function XuluxAskQuestion({ code }: SyntaxHighlighterProps) {
  const [hasSelected, setHasSelected] = useState(false);
  const isLastMessage = useAuiState((s) => s.message.isLast);
  const data = parseAskQuestion(code);
  if (!data || hasSelected || !isLastMessage) return null;

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
            onClick={() => setHasSelected(true)}
            className={cn(
              "inline-flex min-h-8 max-w-full items-center gap-1.5 rounded-md border px-3 py-1.5 text-left text-xs leading-snug transition-colors",
              option.preferred
                ? "border-primary/50 bg-primary text-primary-foreground hover:bg-primary/90"
                : "border-border bg-background hover:bg-muted text-foreground",
            )}
          >
            {option.label}
            {option.preferred ? (
              <span className="text-primary-foreground/80 text-[10px] font-medium">
                Recommended
              </span>
            ) : null}
          </ThreadPrimitive.Suggestion>
        ))}
      </div>
    </div>
  );
}
