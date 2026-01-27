"use client";

import {
  Source,
  SourceIcon,
  SourceTitle,
} from "@/components/assistant-ui/sources";
import { SampleFrame } from "@/components/docs/samples/sample-frame";

const sources = [
  { url: "https://openai.com", title: "OpenAI Research" },
  { url: "https://github.com", title: "github.com" },
  { url: "https://react.dev", title: "React Docs" },
];

function VariantRow({
  label,
  variant,
}: {
  label: string;
  variant?: "outline" | "ghost" | "muted";
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-medium text-muted-foreground text-xs">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {sources.map((source) => (
          <Source key={source.url} variant={variant} href={source.url}>
            <SourceIcon url={source.url} />
            <SourceTitle>{source.title}</SourceTitle>
          </Source>
        ))}
      </div>
    </div>
  );
}

export function SourcesSample() {
  return (
    <SampleFrame className="flex h-auto flex-col gap-6 p-6">
      <VariantRow label="Outline (default)" />
      <VariantRow label="Ghost" variant="ghost" />
      <VariantRow label="Muted" variant="muted" />
    </SampleFrame>
  );
}
