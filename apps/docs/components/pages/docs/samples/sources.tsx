"use client";

import type { ComponentProps } from "react";
import {
  Source,
  SourceIcon,
  SourceTitle,
  Sources,
} from "@/components/assistant-ui/elements/sources.aui";
import { SampleFrame } from "@/components/pages/docs/samples/sample-frame";

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
  variant?: ComponentProps<typeof Source>["variant"];
}) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
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
    <SampleFrame className="flex h-auto flex-col gap-4 p-6">
      <VariantRow label="Outline (default)" />
      <VariantRow label="Ghost" variant="ghost" />
      <VariantRow label="Muted" variant="muted" />
      <div className="flex flex-col gap-2">
        <span className="text-muted-foreground text-xs font-medium">
          Document source
        </span>
        <Sources
          type="source"
          sourceType="document"
          id="doc-1"
          title="Quarterly Report.pdf"
          mediaType="application/pdf"
          status={{ type: "complete" }}
        />
      </div>
    </SampleFrame>
  );
}

const variants = [
  "outline",
  "secondary",
  "muted",
  "ghost",
  "info",
  "warning",
  "success",
  "destructive",
] as const;

export function SourcesVariantsSample() {
  const source = sources[0]!;

  return (
    <SampleFrame className="flex h-auto flex-wrap items-center justify-center gap-2 p-6">
      {variants.map((variant) => (
        <Source key={variant} variant={variant} href={source.url}>
          <SourceIcon url={source.url} />
          <SourceTitle className="capitalize">{variant}</SourceTitle>
        </Source>
      ))}
    </SampleFrame>
  );
}
