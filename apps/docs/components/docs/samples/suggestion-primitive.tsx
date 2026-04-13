"use client";

import { SampleFrame } from "./sample-frame";

type SuggestionItemStaticProps = {
  title: string;
  description: string;
};

function SuggestionItemStatic({
  title,
  description,
}: SuggestionItemStaticProps) {
  return (
    <button
      type="button"
      className="flex h-auto w-full flex-col items-start justify-start gap-1 rounded-2xl border border-border bg-background px-4 py-3 text-left text-sm transition-colors hover:bg-muted"
    >
      <span className="font-medium">{title}</span>
      <span className="text-muted-foreground">{description}</span>
    </button>
  );
}

export function SuggestionPrimitiveSample() {
  return (
    <SampleFrame className="flex h-auto items-center justify-center bg-background p-8">
      <div className="w-full max-w-xl">
        <div className="mb-4 text-center font-semibold text-lg">
          How can I help you?
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
          <SuggestionItemStatic
            title="Write a blog post"
            description="About React Server Components"
          />
          <SuggestionItemStatic
            title="Explain quantum computing"
            description="In simple terms"
          />
          <SuggestionItemStatic
            title="Debug my code"
            description="TypeScript type error"
          />
          <SuggestionItemStatic
            title="Plan a trip"
            description="Weekend in Paris"
          />
        </div>
      </div>
    </SampleFrame>
  );
}
